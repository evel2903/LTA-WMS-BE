import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export const CheckPrintJobPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: { WarehouseId?: string | null; OwnerId?: string | null },
): Promise<boolean> => {
  if (!permissionChecker) return true;
  if (!actorUserId) return false;

  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.PrintJob,
    Scope: { WarehouseId: scope.WarehouseId, OwnerId: scope.OwnerId },
  });
  return decision.Allowed;
};

export const AssertPrintJobPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: { WarehouseId?: string | null; OwnerId?: string | null },
): Promise<void> => {
  const allowed = await CheckPrintJobPermission(permissionChecker, actorUserId, action, scope);
  if (!allowed) {
    throw new ForbiddenAppException('Access denied (OUT_OF_SCOPE)', { Reason: 'OUT_OF_SCOPE' });
  }
};
