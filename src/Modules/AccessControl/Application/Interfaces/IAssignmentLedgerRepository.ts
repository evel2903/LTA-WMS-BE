import { EntityManager } from 'typeorm';
import {
  HeadRecord,
  HeadStatus,
  IntentRecord,
  IntentStatus,
} from '@modules/AccessControl/Application/DTOs/AssignmentIntent';

export const ASSIGNMENT_LEDGER_REPOSITORY = Symbol('IAssignmentLedgerRepository');

/**
 * RH-04 (RH-ASG-01 / D3) transactional ledger. Every method runs inside a caller-provided
 * transaction `manager`; callers MUST invoke in the global lock order:
 * user -> role -> per-user effective version -> item head -> intent -> assignment.
 */
export interface IAssignmentLedgerRepository {
  /** SELECT ... FOR KEY SHARE on users.id; false when the user does not exist. */
  LockUserForKeyShare(manager: EntityManager, userId: string): Promise<boolean>;
  /** SELECT ... FOR KEY SHARE on roles by canonical code; null when the role does not exist. */
  LockRoleForKeyShareByCode(manager: EntityManager, canonicalRoleCode: string): Promise<{ RoleId: string } | null>;

  /** Ensure the per-user effective-version row (bootstrap 0) and lock it FOR UPDATE; returns the version string. */
  EnsureAndLockEffectiveVersion(manager: EntityManager, userId: string): Promise<string>;
  /** Persist `next` (the caller's read+1) into the effective-version row already held FOR UPDATE by an
   * earlier `EnsureAndLockEffectiveVersion` in the same transaction — that lock, not this UPDATE alone,
   * is what makes the increment race-free. */
  IncrementEffectiveVersion(manager: EntityManager, userId: string, next: string): Promise<void>;
  /** Read the effective version FOR SHARE WITHOUT bootstrapping a row (Read-permission callers must not
   * write); returns canonical '0' when absent. */
  ReadEffectiveVersionShared(manager: EntityManager, userId: string): Promise<string>;

  /** Ensure the (user, role) head row (bootstrap version 0 / run NULL / Idle) and lock it FOR UPDATE. */
  EnsureAndLockHeadForUpdate(manager: EntityManager, userId: string, roleId: string): Promise<HeadRecord>;
  /** Read head FOR SHARE WITHOUT bootstrapping (recovery is a Read); null => virtual Idle/0 snapshot. */
  ReadHeadShared(manager: EntityManager, userId: string, roleId: string): Promise<HeadRecord | null>;
  UpdateHead(
    manager: EntityManager,
    id: string,
    fields: { CurrentIntentVersion: string; CurrentRunId: string | null; Status: HeadStatus },
  ): Promise<void>;

  FindIntentByRunId(manager: EntityManager, runId: string): Promise<IntentRecord | null>;
  /** Same as FindIntentByRunId but FOR SHARE — recovery uses this so the current intent cannot
   * transition mid-snapshot (AC6). */
  FindIntentByRunIdShared(manager: EntityManager, runId: string): Promise<IntentRecord | null>;
  InsertIntent(manager: EntityManager, intent: IntentRecord): Promise<void>;
  /** Move the current Registered intent of an item (if any, excluding excludeRunId) to Superseded. */
  SupersedeRegistered(manager: EntityManager, userId: string, roleId: string, excludeRunId: string): Promise<void>;
  FinalizeIntent(
    manager: EntityManager,
    runId: string,
    fields: { Status: IntentStatus; EffectiveVersion: string | null; Outcome: Record<string, unknown> },
  ): Promise<void>;

  /** Raw assignment access under the apply transaction. */
  FindAssignment(manager: EntityManager, userId: string, roleId: string): Promise<{ Id: string } | null>;
  InsertAssignment(
    manager: EntityManager,
    row: { Id: string; UserId: string; RoleId: string; Source: string; AssignedBy: string | null },
  ): Promise<Date>;
  DeleteAssignment(manager: EntityManager, id: string): Promise<void>;
  /** Raw canonical role codes assigned to the user, NOT filtered by Role.Status (assignment truth). */
  ReadAssignedRoleCodesShared(manager: EntityManager, userId: string): Promise<string[]>;
}
