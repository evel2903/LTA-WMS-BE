import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';

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
