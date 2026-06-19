import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
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
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, {
        Reason: decision.Reason,
        Action: metadata.Action,
        ObjectType: metadata.ObjectType,
      });
    }
    return true;
  }
}
