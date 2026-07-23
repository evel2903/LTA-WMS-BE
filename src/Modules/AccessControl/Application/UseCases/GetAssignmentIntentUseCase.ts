import { DataSource } from 'typeorm';
import { NotFoundException } from '@common/Exceptions/AppException';
import { CanonicalizeRoleCode } from '@modules/AccessControl/Application/Utils/CanonicalizeRoleCode';
import { IAssignmentLedgerRepository } from '@modules/AccessControl/Application/Interfaces/IAssignmentLedgerRepository';
import { AssignmentIntentSnapshot, IntentOperation } from '@modules/AccessControl/Application/DTOs/AssignmentIntent';

/**
 * RH-04 recovery endpoint (Read:UserAssignment). Returns one snapshot the FE adopts before enabling
 * mutation. The per-user effective version is read FOR SHARE first: WHEN THE ROW EXISTS its share lock
 * blocks a concurrent apply's FOR UPDATE, so version and the raw assigned-role set are a consistent
 * snapshot. Roles are read raw (not filtered by Role.Status).
 *
 * This is a Read endpoint, so it NEVER writes: absent version/head rows are reported as a virtual
 * Idle/version-0 snapshot rather than bootstrapped (rows are created only on register/apply). This
 * avoids write-amplification from catalog-wide recovery observation and keeps a merely-viewed
 * (user, role) from pinning the FK-restricted users/roles rows (Review Finding, round 1).
 *
 * Consequence of the no-write choice (Review Finding, round 2): for a NEVER-registered user there is
 * no version row to FOR-SHARE-lock, so a concurrent first-ever apply can briefly pair EffectiveVersion
 * '0' with a just-assigned role. This is benign and self-healing — version '0' is below any reservation
 * threshold and no reservation exists before the first apply, and once the row exists every later
 * recovery is fully consistent. (REPEATABLE READ was considered and rejected: it would risk serialization
 * failures on the common existing-row path where the FOR SHARE already serializes correctly.)
 */
export class GetAssignmentIntentUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: IAssignmentLedgerRepository,
  ) {}

  public async Execute(input: {
    ActorUserId: string;
    UserId: string;
    CanonicalRoleCodeRaw: string;
  }): Promise<AssignmentIntentSnapshot> {
    const canonical = CanonicalizeRoleCode(input.CanonicalRoleCodeRaw);

    return this.dataSource.transaction(async (manager) => {
      if (!(await this.ledger.LockUserForKeyShare(manager, input.UserId))) {
        throw new NotFoundException('User not found');
      }
      const role = await this.ledger.LockRoleForKeyShareByCode(manager, canonical);
      if (!role) throw new NotFoundException('Role not found');

      const effectiveVersion = await this.ledger.ReadEffectiveVersionShared(manager, input.UserId);
      // No head row yet => this (user, role) has never been registered/applied: a virtual Idle/0
      // snapshot, NOT a bootstrapped row.
      const head = await this.ledger.ReadHeadShared(manager, input.UserId, role.RoleId);
      const currentRunId = head?.CurrentRunId ?? null;

      let operation: IntentOperation | null = null;
      let isOwned = false;
      if (currentRunId) {
        const current = await this.ledger.FindIntentByRunIdShared(manager, currentRunId);
        if (current) {
          operation = current.Operation;
          isOwned = current.ActorUserId === input.ActorUserId;
        }
      }

      const assignedRoleCodes = await this.ledger.ReadAssignedRoleCodesShared(manager, input.UserId);

      return {
        UserId: input.UserId,
        RoleCode: canonical,
        RunId: currentRunId,
        Operation: operation,
        Status: head?.Status ?? 'Idle',
        IntentVersion: head?.CurrentIntentVersion ?? '0',
        EffectiveVersion: effectiveVersion,
        AssignedRoleCodes: assignedRoleCodes,
        IsOwnedByCurrentActor: isOwned,
      };
    });
  }
}
