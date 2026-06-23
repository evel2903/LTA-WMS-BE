import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export const CheckPutawayTaskPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: { WarehouseId?: string | null; OwnerId?: string | null },
): Promise<boolean> => {
  if (!actorUserId) {
    return false;
  }
  if (!permissionChecker) {
    return true;
  }
  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.PutawayTask,
    Scope: { WarehouseId: scope.WarehouseId, OwnerId: scope.OwnerId },
  });
  return decision.Allowed;
};

export const AssertPutawayTaskPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: { WarehouseId?: string | null; OwnerId?: string | null },
): Promise<void> => {
  const allowed = await CheckPutawayTaskPermission(permissionChecker, actorUserId, action, scope);
  if (!allowed) {
    throw new ForbiddenAppException('Access denied (OUT_OF_SCOPE)', { Reason: 'OUT_OF_SCOPE' });
  }
};

export const AssertInventoryMovementPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: { WarehouseId?: string | null; OwnerId?: string | null },
): Promise<void> => {
  if (!actorUserId) {
    throw new ForbiddenAppException('Access denied (OUT_OF_SCOPE)', { Reason: 'OUT_OF_SCOPE' });
  }
  if (!permissionChecker) {
    return;
  }
  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.InventoryMovement,
    Scope: { WarehouseId: scope.WarehouseId, OwnerId: scope.OwnerId },
  });
  if (!decision.Allowed) {
    throw new ForbiddenAppException('Access denied (OUT_OF_SCOPE)', { Reason: 'OUT_OF_SCOPE' });
  }
};
