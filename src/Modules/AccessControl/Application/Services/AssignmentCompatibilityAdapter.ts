import { randomUUID } from 'crypto';
import { AppException } from '@common/Exceptions/AppException';
import { ErrorCode } from '@common/Constants/ErrorCode';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IntentOperation } from '@modules/AccessControl/Application/DTOs/AssignmentIntent';
import { RegisterAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/RegisterAssignmentIntentUseCase';
import { ApplyAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/ApplyAssignmentIntentUseCase';

/**
 * RH-04 dual-protocol rollout phase 1: legacy assign/remove calls that arrive WITHOUT an intent
 * ticket are routed through the same head/version/audit seam by minting a synthetic server RunId,
 * registering, then applying — never a direct write. The legacy response shape (bare UserRoleDto /
 * `{ Removed }`) is preserved so old FE keeps working until the ticket protocol is deployed and
 * legacy telemetry reaches zero (phase 2), after which strict-v2 (phase 3) can drop this adapter.
 */
export class AssignmentCompatibilityAdapter {
  // ponytail: bounded retry — register and apply are separate transactions, so a concurrent
  // registration for the same (user, role) can supersede the synthetic ticket between them, making
  // apply throw 409 IntentStale (a code the OLD FE cannot interpret). Re-mint + re-drive on stale so
  // a plain legacy call converges to a legacy-shaped outcome; the cap prevents an unbounded loop
  // under pathological contention (Review Finding, round 1).
  private static readonly MAX_STALE_RETRIES = 5;

  constructor(
    private readonly register: RegisterAssignmentIntentUseCase,
    private readonly apply: ApplyAssignmentIntentUseCase,
  ) {}

  public async LegacyAssign(
    input: { ActorUserId: string; UserId: string; RoleCode: string },
    context: AuditContext = SystemAuditContext,
  ): Promise<{ Id: string; UserId: string; RoleId: string; RoleCode: string; Source: string; AssignedAt: string }> {
    const b = await this.registerAndApply('assign', input, context);
    return {
      Id: b.Id as string,
      UserId: b.UserId as string,
      RoleId: b.RoleId as string,
      RoleCode: b.RoleCode as string,
      Source: b.Source as string,
      AssignedAt: b.AssignedAt as string,
    };
  }

  public async LegacyRemove(
    input: { ActorUserId: string; UserId: string; RoleCode: string },
    context: AuditContext = SystemAuditContext,
  ): Promise<{ Removed: boolean }> {
    const b = await this.registerAndApply('remove', input, context);
    return { Removed: b.Removed as boolean };
  }

  /** Register a fresh synthetic ticket then apply it, retrying on 409 IntentStale (our ticket was
   * superseded by a concurrent registration). RoleAlreadyAssigned / SatisfiedNoChange and every other
   * error propagate unchanged — they are legitimate terminal outcomes the legacy caller already
   * expects. */
  private async registerAndApply(
    operation: IntentOperation,
    input: { ActorUserId: string; UserId: string; RoleCode: string },
    context: AuditContext,
  ): Promise<Record<string, unknown>> {
    let lastStale: AppException | undefined;
    for (let attempt = 0; attempt < AssignmentCompatibilityAdapter.MAX_STALE_RETRIES; attempt++) {
      const runId = randomUUID();
      const reg = await this.register.Execute({
        ActorUserId: input.ActorUserId,
        UserId: input.UserId,
        CanonicalRoleCodeRaw: input.RoleCode,
        Operation: operation,
        RunId: runId,
      });
      try {
        const outcome = await this.apply.Execute(
          {
            ActorUserId: input.ActorUserId,
            UserId: input.UserId,
            CanonicalRoleCodeRaw: input.RoleCode,
            Operation: operation,
            RunId: runId,
            IntentVersion: reg.Data.IntentVersion,
          },
          context,
        );
        return outcome.Body;
      } catch (error) {
        if (error instanceof AppException && error.ErrorCode === ErrorCode.IntentStale) {
          lastStale = error;
          continue;
        }
        throw error;
      }
    }
    throw lastStale;
  }
}
