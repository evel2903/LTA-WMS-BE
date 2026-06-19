import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';

type RequestWithContext = {
  user?: { UserId?: string; Role?: string };
  correlationId?: string;
  requestId?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

/**
 * Builds the AuditContext from the request: actor from request.user (legacy Role mapped
 * to a single role-code fallback for V0), correlation/request id from CorrelationIdMiddleware,
 * ip + user-agent from the request. Controllers pass it into mutation use cases.
 */
export const CurrentAuditContext = createParamDecorator((_data: unknown, context: ExecutionContext): AuditContext => {
  const request = context.switchToHttp().getRequest<RequestWithContext>();
  const userAgent = request.headers?.['user-agent'];
  return {
    ActorUserId: request.user?.UserId ?? null,
    ActorRoleCodes: request.user?.Role ? [request.user.Role] : [],
    ActorType: ActorType.User,
    CorrelationId: request.correlationId ?? null,
    RequestId: request.requestId ?? null,
    IpAddress: request.ip ?? null,
    UserAgent: typeof userAgent === 'string' ? userAgent : null,
  };
});
