import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';

/**
 * Per-request actor/trace context threaded into mutation use cases so the audit record
 * (C4 IAuditWriter) captures who/where. Built by the @CurrentAuditContext() decorator.
 */
export interface AuditContext {
  ActorUserId: string | null;
  ActorRoleCodes: string[];
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
    'ActorUserId' | 'ActorRoleCodes' | 'ActorType' | 'CorrelationId' | 'RequestId' | 'IpAddress' | 'UserAgent'
  >,
): AuditEntry {
  return {
    ActorUserId: context.ActorUserId,
    ActorRoleCodes: context.ActorRoleCodes,
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
  ActorType: ActorType.System,
  CorrelationId: null,
  RequestId: null,
  IpAddress: null,
  UserAgent: null,
};
