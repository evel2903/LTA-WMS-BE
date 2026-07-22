import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';

/**
 * Per-request actor/trace context threaded into mutation use cases so the audit record
 * (C4 IAuditWriter) captures who/where. Built by the @CurrentAuditContext() decorator.
 */
export interface AuditContext {
  ActorUserId: string | null;
  ActorRoleCodes: string[];
  /** Omitted only by legacy/direct compatibility callers. */
  ActorSnapshotStatus?: ActorSnapshotStatus;
  ActorType: ActorType;
  CorrelationId: string | null;
  RequestId: string | null;
  IpAddress: string | null;
  UserAgent: string | null;
}

/** Merge per-request actor/trace context with the command-specific audit fields. */
export function MergeAuditContext(
  context: AuditContext,
  fields: Omit<
    AuditEntry,
    | 'ActorUserId'
    | 'ActorRoleCodes'
    | 'ActorSnapshotStatus'
    | 'ActorType'
    | 'CorrelationId'
    | 'RequestId'
    | 'IpAddress'
    | 'UserAgent'
  >,
): AuditEntry {
  return {
    ActorUserId: context.ActorUserId,
    ActorRoleCodes: context.ActorRoleCodes,
    ActorSnapshotStatus: context.ActorSnapshotStatus,
    ActorType: context.ActorType,
    CorrelationId: context.CorrelationId,
    RequestId: context.RequestId,
    IpAddress: context.IpAddress,
    UserAgent: context.UserAgent,
    ...fields,
  };
}

/** A system/non-request actor context (background jobs, seeds). */
export const SystemAuditContext: AuditContext = {
  ActorUserId: null,
  ActorRoleCodes: [],
  ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
  ActorType: ActorType.System,
  CorrelationId: null,
  RequestId: null,
  IpAddress: null,
  UserAgent: null,
};
