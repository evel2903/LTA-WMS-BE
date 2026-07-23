import { DataSource } from 'typeorm';
import { AppException, BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@common/Constants/ErrorCode';
import { CanonicalizeRoleCode } from '@modules/AccessControl/Application/Utils/CanonicalizeRoleCode';
import { AssignmentVersion } from '@modules/AccessControl/Domain/ValueObjects/AssignmentVersion';
import { IAssignmentLedgerRepository } from '@modules/AccessControl/Application/Interfaces/IAssignmentLedgerRepository';
import { IntentOperation } from '@modules/AccessControl/Application/DTOs/AssignmentIntent';

const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface RegisterIntentInput {
  ActorUserId: string;
  UserId: string;
  CanonicalRoleCodeRaw: string;
  Operation: IntentOperation;
  RunId: string;
}

export interface RegisterIntentResult {
  Replay: boolean; // false => 201 (new ordinal), true => 200 (idempotent replay)
  Data: {
    RunId: string;
    Operation: IntentOperation;
    Status: string;
    IntentVersion: string;
    EffectiveVersion: string;
    IsCurrent: boolean;
  };
}

/**
 * RH-04 register endpoint. Assigns a server ordinal to a new intent and fences apply. Replays are
 * actor+item+operation+RunId-exact; a RunId reused with a different identity is 409 RUN_ID_REUSED
 * (no outcome leak). Runs in the global lock order user -> role -> effective version -> head.
 */
export class RegisterAssignmentIntentUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: IAssignmentLedgerRepository,
  ) {}

  public async Execute(input: RegisterIntentInput): Promise<RegisterIntentResult> {
    const canonical = CanonicalizeRoleCode(input.CanonicalRoleCodeRaw);
    if (input.Operation !== 'assign' && input.Operation !== 'remove') {
      throw new BusinessRuleException('Operation must be "assign" or "remove"');
    }
    if (typeof input.RunId !== 'string' || !RUN_ID.test(input.RunId)) {
      throw new BusinessRuleException('RunId must be a canonical lowercase UUID v4');
    }

    return this.dataSource.transaction(async (manager) => {
      if (!(await this.ledger.LockUserForKeyShare(manager, input.UserId))) {
        throw new NotFoundException('User not found');
      }
      const role = await this.ledger.LockRoleForKeyShareByCode(manager, canonical);
      if (!role) throw new NotFoundException('Role not found');

      const effectiveVersion = await this.ledger.EnsureAndLockEffectiveVersion(manager, input.UserId);
      const head = await this.ledger.EnsureAndLockHeadForUpdate(manager, input.UserId, role.RoleId);

      const existing = await this.ledger.FindIntentByRunId(manager, input.RunId);
      if (existing) {
        const sameIdentity =
          existing.ActorUserId === input.ActorUserId &&
          existing.UserId === input.UserId &&
          existing.RoleId === role.RoleId &&
          existing.Operation === input.Operation;
        if (!sameIdentity) {
          throw new AppException(
            'RunId already used for a different intent',
            HttpStatus.CONFLICT,
            ErrorCode.RunIdReused,
          );
        }
        // Idempotent replay of registration: same persisted ticket, no new ordinal.
        return {
          Replay: true,
          Data: {
            RunId: existing.RunId,
            Operation: existing.Operation,
            Status: existing.Status,
            IntentVersion: existing.IntentVersion,
            EffectiveVersion: effectiveVersion,
            IsCurrent: head.CurrentRunId === existing.RunId,
          },
        };
      }

      // New intent: supersede the prior current Registered ticket, increment the head ordinal.
      await this.ledger.SupersedeRegistered(manager, input.UserId, role.RoleId, input.RunId);
      const nextVersion = AssignmentVersion.parse(head.CurrentIntentVersion, 'IntentVersion')
        .next('IntentVersion')
        .toString();

      await this.ledger.InsertIntent(manager, {
        RunId: input.RunId,
        ActorUserId: input.ActorUserId,
        UserId: input.UserId,
        RoleId: role.RoleId,
        CanonicalRoleCode: canonical,
        Operation: input.Operation,
        IntentVersion: nextVersion,
        Status: 'Registered',
        EffectiveVersion: null,
        Outcome: null,
      });
      await this.ledger.UpdateHead(manager, head.Id, {
        CurrentIntentVersion: nextVersion,
        CurrentRunId: input.RunId,
        Status: 'Registered',
      });

      return {
        Replay: false,
        Data: {
          RunId: input.RunId,
          Operation: input.Operation,
          Status: 'Registered',
          IntentVersion: nextVersion,
          EffectiveVersion: effectiveVersion,
          IsCurrent: true,
        },
      };
    });
  }
}
