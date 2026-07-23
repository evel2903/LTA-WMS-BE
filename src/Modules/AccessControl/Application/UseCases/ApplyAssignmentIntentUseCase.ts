import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { AppException, BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ErrorCode } from '@common/Constants/ErrorCode';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { CanonicalizeRoleCode } from '@modules/AccessControl/Application/Utils/CanonicalizeRoleCode';
import { AssignmentVersion } from '@modules/AccessControl/Domain/ValueObjects/AssignmentVersion';
import { IAssignmentLedgerRepository } from '@modules/AccessControl/Application/Interfaces/IAssignmentLedgerRepository';
import { IntentOperation } from '@modules/AccessControl/Application/DTOs/AssignmentIntent';

const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface ApplyIntentInput {
  ActorUserId: string;
  UserId: string;
  CanonicalRoleCodeRaw: string;
  Operation: IntentOperation;
  RunId: string;
  IntentVersion: string;
}

/** Terminal HTTP/business outcome persisted on the intent and replayed verbatim. */
interface ApplyOutcome {
  HttpStatus: number;
  Code: ErrorCode | null;
  Body: Record<string, unknown>;
}

/**
 * RH-04 apply (assign POST / remove DELETE). Validates the ticket in the global lock order, then
 * commits the assignment effect (or no-op), audit, EffectiveVersion bump, terminal intent + head
 * outcome in ONE transaction. The wire result is rendered AFTER commit from the persisted outcome:
 * < 400 -> success body; >= 400 -> thrown so the error filter renders the same envelope. Thus a
 * duplicate-assign persists SatisfiedNoChange AND still answers 409, and a lost response is
 * recovered by exact replay. Hard validation failures (404/403/stale-409/400) throw INSIDE the
 * transaction so nothing is persisted.
 */
export class ApplyAssignmentIntentUseCase {
  constructor(
    private readonly ledger: IAssignmentLedgerRepository,
    private readonly auditedTransaction: AuditedTransaction,
  ) {}

  public async Execute(input: ApplyIntentInput, context: AuditContext = SystemAuditContext): Promise<ApplyOutcome> {
    const canonical = CanonicalizeRoleCode(input.CanonicalRoleCodeRaw);
    if (input.Operation !== 'assign' && input.Operation !== 'remove') {
      throw new BusinessRuleException('Operation must be "assign" or "remove"');
    }
    if (typeof input.RunId !== 'string' || !RUN_ID.test(input.RunId)) {
      throw new BusinessRuleException('RunId must be a canonical lowercase UUID v4');
    }
    const requestedVersion = AssignmentVersion.parse(input.IntentVersion, 'IntentVersion').toString();

    const outcome = await this.auditedTransaction.Run<ApplyOutcome>(async (manager) => {
      if (!(await this.ledger.LockUserForKeyShare(manager, input.UserId))) {
        throw new NotFoundException('User not found');
      }
      const role = await this.ledger.LockRoleForKeyShareByCode(manager, canonical);
      if (!role) throw new NotFoundException('Role not found');

      const effectiveVersion = await this.ledger.EnsureAndLockEffectiveVersion(manager, input.UserId);
      const head = await this.ledger.EnsureAndLockHeadForUpdate(manager, input.UserId, role.RoleId);

      const intent = await this.ledger.FindIntentByRunId(manager, input.RunId);
      if (!intent) {
        throw new AppException('Intent ticket not found', HttpStatus.CONFLICT, ErrorCode.IntentStale, {
          CurrentRunId: head.CurrentRunId,
          CurrentIntentVersion: head.CurrentIntentVersion,
        });
      }
      if (intent.ActorUserId !== input.ActorUserId) {
        throw new AppException('Intent belongs to another actor', HttpStatus.FORBIDDEN, ErrorCode.IntentActorMismatch);
      }
      const identityMatches =
        intent.UserId === input.UserId &&
        intent.RoleId === role.RoleId &&
        intent.Operation === input.Operation &&
        intent.IntentVersion === requestedVersion;
      if (!identityMatches) {
        throw new AppException('Intent identity mismatch', HttpStatus.CONFLICT, ErrorCode.IntentStale, {
          CurrentRunId: head.CurrentRunId,
          CurrentIntentVersion: head.CurrentIntentVersion,
        });
      }

      // Terminal transport replay: return the persisted outcome regardless of the current head.
      if (intent.Status === 'Applied' || intent.Status === 'SatisfiedNoChange') {
        return { result: this.persistedOutcome(intent), entry: [] };
      }
      if (intent.Status === 'Superseded') {
        throw new AppException('Intent superseded', HttpStatus.CONFLICT, ErrorCode.IntentStale, {
          CurrentRunId: head.CurrentRunId,
          CurrentIntentVersion: head.CurrentIntentVersion,
        });
      }
      // Registered: only the current head ticket may apply.
      if (head.CurrentRunId !== input.RunId || head.CurrentIntentVersion !== requestedVersion) {
        throw new AppException('Intent no longer current', HttpStatus.CONFLICT, ErrorCode.IntentStale, {
          CurrentRunId: head.CurrentRunId,
          CurrentIntentVersion: head.CurrentIntentVersion,
        });
      }

      const existing = await this.ledger.FindAssignment(manager, input.UserId, role.RoleId);

      if (input.Operation === 'assign') {
        if (existing) {
          return this.finalizeNoChange(manager, intent.RunId, head.Id, requestedVersion, effectiveVersion, {
            HttpStatus: HttpStatus.CONFLICT,
            Code: ErrorCode.RoleAlreadyAssigned,
            Body: {
              Message: 'User already has this role',
              RoleCode: canonical,
              Assigned: false,
              RunId: input.RunId,
              Status: 'SatisfiedNoChange',
              IntentVersion: requestedVersion,
              EffectiveVersion: effectiveVersion,
            },
          });
        }
        const nextEff = AssignmentVersion.parse(effectiveVersion, 'EffectiveVersion')
          .next('EffectiveVersion')
          .toString();
        const id = randomUUID();
        const assignedAt = await this.ledger.InsertAssignment(manager, {
          Id: id,
          UserId: input.UserId,
          RoleId: role.RoleId,
          Source: UserRoleSource.Manual,
          AssignedBy: input.ActorUserId,
        });
        await this.ledger.IncrementEffectiveVersion(manager, input.UserId, nextEff);
        const body = {
          Id: id,
          UserId: input.UserId,
          RoleId: role.RoleId,
          RoleCode: canonical,
          Source: UserRoleSource.Manual,
          AssignedAt: assignedAt.toISOString(),
          Assigned: true,
          RunId: input.RunId,
          Status: 'Applied',
          IntentVersion: requestedVersion,
          EffectiveVersion: nextEff,
        };
        await this.ledger.FinalizeIntent(manager, intent.RunId, {
          Status: 'Applied',
          EffectiveVersion: nextEff,
          Outcome: { HttpStatus: HttpStatus.CREATED, Code: null, Body: body },
        });
        await this.ledger.UpdateHead(manager, head.Id, {
          CurrentIntentVersion: requestedVersion,
          CurrentRunId: input.RunId,
          Status: 'Applied',
        });
        const entry = MergeAuditContext(context, {
          Action: ActionCode.Create,
          ObjectType: ObjectType.UserAssignment,
          ObjectId: id,
          ObjectCode: canonical,
          AfterJson: body as unknown as Record<string, unknown>,
        });
        return { result: { HttpStatus: HttpStatus.CREATED, Code: null, Body: body }, entry: [entry] };
      }

      // remove
      if (!existing) {
        return this.finalizeNoChange(manager, intent.RunId, head.Id, requestedVersion, effectiveVersion, {
          HttpStatus: HttpStatus.OK,
          Code: null,
          Body: {
            RoleCode: canonical,
            Removed: false,
            RunId: input.RunId,
            Status: 'SatisfiedNoChange',
            IntentVersion: requestedVersion,
            EffectiveVersion: effectiveVersion,
          },
        });
      }
      const nextEff = AssignmentVersion.parse(effectiveVersion, 'EffectiveVersion').next('EffectiveVersion').toString();
      await this.ledger.DeleteAssignment(manager, existing.Id);
      await this.ledger.IncrementEffectiveVersion(manager, input.UserId, nextEff);
      const body = {
        RoleCode: canonical,
        Removed: true,
        RunId: input.RunId,
        Status: 'Applied',
        IntentVersion: requestedVersion,
        EffectiveVersion: nextEff,
      };
      await this.ledger.FinalizeIntent(manager, intent.RunId, {
        Status: 'Applied',
        EffectiveVersion: nextEff,
        Outcome: { HttpStatus: HttpStatus.OK, Code: null, Body: body },
      });
      await this.ledger.UpdateHead(manager, head.Id, {
        CurrentIntentVersion: requestedVersion,
        CurrentRunId: input.RunId,
        Status: 'Applied',
      });
      const entry = MergeAuditContext(context, {
        Action: ActionCode.DeleteCancel,
        ObjectType: ObjectType.UserAssignment,
        ObjectId: existing.Id,
        ObjectCode: canonical,
        BeforeJson: { Id: existing.Id, UserId: input.UserId, RoleId: role.RoleId, RoleCode: canonical },
      });
      return { result: { HttpStatus: HttpStatus.OK, Code: null, Body: body }, entry: [entry] };
    });

    if (outcome.HttpStatus >= 400) {
      throw new AppException(
        (outcome.Body.Message as string) ?? 'Assignment intent conflict',
        outcome.HttpStatus,
        outcome.Code ?? ErrorCode.Conflict,
        outcome.Body,
      );
    }
    return outcome;
  }

  private async finalizeNoChange(
    manager: EntityManager,
    runId: string,
    headId: string,
    intentVersion: string,
    effectiveVersion: string,
    outcome: ApplyOutcome,
  ): Promise<{ result: ApplyOutcome; entry: AuditEntry[] }> {
    await this.ledger.FinalizeIntent(manager, runId, {
      Status: 'SatisfiedNoChange',
      EffectiveVersion: effectiveVersion,
      Outcome: outcome as unknown as Record<string, unknown>,
    });
    await this.ledger.UpdateHead(manager, headId, {
      CurrentIntentVersion: intentVersion,
      CurrentRunId: runId,
      Status: 'SatisfiedNoChange',
    });
    return { result: outcome, entry: [] };
  }

  private persistedOutcome(intent: { Outcome: Record<string, unknown> | null }): ApplyOutcome {
    const o = (intent.Outcome ?? {}) as Partial<ApplyOutcome>;
    return {
      HttpStatus: typeof o.HttpStatus === 'number' ? o.HttpStatus : HttpStatus.OK,
      Code: (o.Code as ErrorCode | null) ?? null,
      Body: (o.Body as Record<string, unknown>) ?? {},
    };
  }
}
