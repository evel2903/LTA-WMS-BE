import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ScopeTarget } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

type UpdateRequestWithActor = {
  ActorUserId?: string | null;
};

const hasScopeAxis = (scope: ScopeTarget): boolean =>
  scope.WarehouseId != null || scope.ZoneId != null || scope.OwnerId != null;

const scopeKey = (scope: ScopeTarget): string =>
  [scope.WarehouseId ?? '', scope.ZoneId ?? '', scope.OwnerId ?? ''].join('|');

export const ResolveActorUserId = (request: UpdateRequestWithActor, context: AuditContext): string | undefined =>
  context.ActorUserId ?? request.ActorUserId ?? undefined;

export const AssertUpdateDataScopes = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | undefined,
  objectType: ObjectType,
  scopes: ScopeTarget[],
): Promise<void> => {
  if (!permissionChecker || !actorUserId) {
    return;
  }

  const uniqueScopes = new Map<string, ScopeTarget>();
  for (const scope of scopes) {
    if (hasScopeAxis(scope)) {
      uniqueScopes.set(scopeKey(scope), scope);
    }
  }

  for (const scope of uniqueScopes.values()) {
    const decision = await permissionChecker.Check({
      UserId: actorUserId,
      Action: ActionCode.Update,
      ObjectType: objectType,
      Scope: scope,
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, { Reason: decision.Reason });
    }
  }
};
