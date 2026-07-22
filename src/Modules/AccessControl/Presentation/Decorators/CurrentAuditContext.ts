import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  AuthorizationSnapshot,
  AuthorizationSnapshotRoleCodes,
} from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { SnapshotResolutionError } from '@modules/AccessControl/Application/Errors/SnapshotResolutionError';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';

export const CURRENT_AUDIT_CONTEXT_KEY = 'CurrentAuditContext';

export type RequestWithAuditContext = {
  user?: { UserId?: string; Role?: string };
  AuthorizationSnapshot?: AuthorizationSnapshot;
  correlationId?: string;
  requestId?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

/** Synchronous projection of the snapshot that PermissionGuard resolved before parameters run. */
export function BuildCurrentAuditContext(request: RequestWithAuditContext): AuditContext {
  const userId = request.user?.UserId;
  const snapshot = request.AuthorizationSnapshot;
  if (!userId || !snapshot || snapshot.UserId !== userId) {
    throw new SnapshotResolutionError();
  }

  const userAgent = request.headers?.['user-agent'];
  return {
    ActorUserId: userId,
    ActorRoleCodes: AuthorizationSnapshotRoleCodes(snapshot),
    ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
    ActorType: ActorType.User,
    CorrelationId: request.correlationId ?? null,
    RequestId: request.requestId ?? null,
    IpAddress: request.ip ?? null,
    UserAgent: typeof userAgent === 'string' ? userAgent : null,
  };
}

const MarkCurrentAuditContext: ParameterDecorator = (target, propertyKey) => {
  if (propertyKey === undefined) return;
  Reflect.defineMetadata(CURRENT_AUDIT_CONTEXT_KEY, true, target, propertyKey);
  Reflect.defineMetadata(CURRENT_AUDIT_CONTEXT_KEY, true, target.constructor, propertyKey);
  const handler = (target as Record<PropertyKey, unknown>)[propertyKey];
  if (typeof handler === 'function') Reflect.defineMetadata(CURRENT_AUDIT_CONTEXT_KEY, true, handler);
};

/** Marks the handler for eager guard resolution, then reads the already-published snapshot. */
export const CurrentAuditContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditContext =>
    BuildCurrentAuditContext(context.switchToHttp().getRequest<RequestWithAuditContext>()),
  [MarkCurrentAuditContext],
);
