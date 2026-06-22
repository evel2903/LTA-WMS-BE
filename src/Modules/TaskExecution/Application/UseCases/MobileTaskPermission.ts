import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';

export const CheckMobileTaskPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  task: MobileTaskEntity,
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
    ObjectType: ObjectType.MobileTask,
    Scope: { WarehouseId: task.WarehouseId, OwnerId: task.OwnerId },
  });
  return decision.Allowed;
};

export const AssertMobileTaskPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  task: MobileTaskEntity,
): Promise<void> => {
  const allowed = await CheckMobileTaskPermission(permissionChecker, actorUserId, action, task);
  if (!allowed) {
    throw new ForbiddenAppException('Access denied (OUT_OF_SCOPE)', { Reason: 'OUT_OF_SCOPE' });
  }
};
