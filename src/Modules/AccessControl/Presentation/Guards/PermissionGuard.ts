import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ScopeTarget } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';

type AuthenticatedRequest = Request & { user?: { UserId?: string } };

/**
 * Opt-in guard: routes without `@RequirePermission` pass through. Otherwise reads
 * the caller's UserId (populated by JwtAuthGuard, which MUST run first), resolves the
 * permission/scope/segregation decision via `IPermissionChecker`, and throws a stable
 * 403 (`ForbiddenAppException`, code FORBIDDEN) with a `Reason` discriminator on deny.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scopeExtractor: ScopeExtractor,
    @Inject(PERMISSION_CHECKER) private readonly checker: IPermissionChecker,
    @Optional() private readonly audited?: AuditedTransaction,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RequirePermissionMetadata | undefined>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.UserId;
    if (!userId) {
      throw new ForbiddenAppException('Authentication required', { Reason: 'NO_USER' });
    }

    const scope = metadata.Scope ? this.scopeExtractor.Extract(request, metadata.Scope) : undefined;
    const decision = await this.checker.Check({
      UserId: userId,
      Action: metadata.Action,
      ObjectType: metadata.ObjectType,
      Scope: scope,
    });

    if (!decision.Allowed) {
      await this.AppendDeniedAudit(request, metadata, decision.Reason ?? 'DENIED', scope);
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, {
        Reason: decision.Reason,
        Action: metadata.Action,
        ObjectType: metadata.ObjectType,
      });
    }
    return true;
  }

  private async AppendDeniedAudit(
    request: AuthenticatedRequest,
    metadata: RequirePermissionMetadata,
    reason: string,
    scope?: ScopeTarget,
  ): Promise<void> {
    if (!this.audited || !request.user?.UserId) return;
    await this.audited.Run(async () => ({
      result: null,
      entry: {
        ActorUserId: request.user?.UserId,
        ActorType: ActorType.User,
        Action: metadata.Action,
        ObjectType: metadata.ObjectType,
        AfterJson: {
          Decision: 'Denied',
          Reason: reason,
          Action: metadata.Action,
          ObjectType: metadata.ObjectType,
        },
        ScopeJson: scope ? { ...scope } : null,
        ReferenceType: 'PermissionGuard',
        ReferenceId: request.user?.UserId,
        WarehouseId: this.StringScope(scope?.WarehouseId),
        OwnerId: this.StringScope(scope?.OwnerId),
        CorrelationId: this.HeaderValue(request.headers?.['x-correlation-id']),
        RequestId: this.HeaderValue(request.headers?.['x-request-id']),
        IpAddress: request.ip ?? null,
        UserAgent: this.HeaderValue(request.headers?.['user-agent']),
        Result: AuditResult.Failed,
      },
    }));
  }

  private HeaderValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }

  private StringScope(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
