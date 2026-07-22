import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
import {
  AuthorizationSnapshot,
  AuthorizationSnapshotRoleCodes,
} from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { ScopeTarget } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import {
  ACTOR_SNAPSHOT_UNAVAILABLE,
  SnapshotResolutionError,
} from '@modules/AccessControl/Application/Errors/SnapshotResolutionError';
import {
  AUTHORIZATION_SNAPSHOT_RESOLVER,
  IAuthorizationSnapshotResolver,
} from '@modules/AccessControl/Application/Interfaces/IAuthorizationSnapshotResolver';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { CURRENT_AUDIT_CONTEXT_KEY } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';

type AuthenticatedRequest = Request & {
  user?: { UserId?: string };
  AuthorizationSnapshot?: AuthorizationSnapshot;
};

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly scopeExtractor: ScopeExtractor,
    @Inject(PERMISSION_CHECKER) private readonly checker: IPermissionChecker,
    @Inject(AUTHORIZATION_SNAPSHOT_RESOLVER) private readonly resolver: IAuthorizationSnapshotResolver,
    private readonly requestContext: AuthorizationSnapshotContext,
    private readonly audited: AuditedTransaction,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const metadata = this.reflector.getAllAndOverride<RequirePermissionMetadata | undefined>(
      REQUIRE_PERMISSION_KEY,
      targets,
    );
    const auditContextRequired =
      this.reflector.getAllAndOverride<boolean | undefined>(CURRENT_AUDIT_CONTEXT_KEY, targets) === true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!metadata && !auditContextRequired) {
      if (request.user?.UserId) this.requestContext.BindActor(request.user.UserId);
      return true;
    }

    const userId = request.user?.UserId;
    if (!userId) throw new ForbiddenAppException('Authentication required', { Reason: 'NO_USER' });
    this.requestContext.BindActor(userId);

    let snapshot: AuthorizationSnapshot;
    try {
      snapshot = await this.requestContext.Resolve(userId, () => this.resolver.Resolve(userId));
      request.AuthorizationSnapshot = snapshot;
    } catch (error) {
      if (!(error instanceof SnapshotResolutionError)) throw error;
      if (!metadata) throw error;
      const scope = metadata.Scope ? this.scopeExtractor.Extract(request, metadata.Scope) : undefined;
      await this.TryAppendDeniedAudit(
        request,
        metadata,
        ACTOR_SNAPSHOT_UNAVAILABLE,
        scope,
        null,
        ActorSnapshotStatus.Unresolved,
      );
      throw new ForbiddenAppException('Access denied (actor snapshot unavailable)', {
        Reason: ACTOR_SNAPSHOT_UNAVAILABLE,
        Action: metadata.Action,
        ObjectType: metadata.ObjectType,
      });
    }

    if (!metadata) return true;
    const scope = metadata.Scope ? this.scopeExtractor.Extract(request, metadata.Scope) : undefined;
    const decision = await this.checker.Check(
      { UserId: userId, Action: metadata.Action, ObjectType: metadata.ObjectType, Scope: scope },
      snapshot,
    );

    if (!decision.Allowed) {
      const reason = decision.Reason ?? 'DENIED';
      await this.TryAppendDeniedAudit(
        request,
        metadata,
        reason,
        scope,
        AuthorizationSnapshotRoleCodes(snapshot),
        ActorSnapshotStatus.Resolved,
      );
      throw new ForbiddenAppException(`Access denied (${reason})`, {
        Reason: reason,
        Action: metadata.Action,
        ObjectType: metadata.ObjectType,
      });
    }
    return true;
  }

  private async TryAppendDeniedAudit(
    request: AuthenticatedRequest,
    metadata: RequirePermissionMetadata,
    reason: string,
    scope: ScopeTarget | undefined,
    actorRoleCodes: string[] | null,
    snapshotStatus: ActorSnapshotStatus,
  ): Promise<void> {
    try {
      await this.audited.Run(async () => ({
        result: null,
        entry: {
          ActorUserId: request.user?.UserId,
          ActorRoleCodes: actorRoleCodes,
          ActorSnapshotStatus: snapshotStatus,
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
    } catch (error) {
      this.logger.error(
        `Permission denied audit append failed (SnapshotStatus=${snapshotStatus}, Reason=${reason})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private HeaderValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }

  private StringScope(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
