import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export const AssertQcTaskPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: { WarehouseId: string; OwnerId: string },
): Promise<void> => {
  if (!permissionChecker || !actorUserId) return;
  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.QcTask,
    Scope: { WarehouseId: scope.WarehouseId, OwnerId: scope.OwnerId },
  });
  if (!decision.Allowed) {
    throw new ForbiddenAppException(`Access denied (${decision.Reason ?? 'OUT_OF_SCOPE'})`, {
      Reason: decision.Reason ?? 'OUT_OF_SCOPE',
      Action: action,
      ObjectType: ObjectType.QcTask,
    });
  }
};
