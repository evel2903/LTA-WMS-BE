import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';

export const AssertReceiptPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  receipt: ReceiptEntity,
): Promise<void> => {
  if (!permissionChecker || !actorUserId) return;
  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.Receipt,
    Scope: { WarehouseId: receipt.WarehouseId, OwnerId: receipt.OwnerId },
  });
  if (!decision.Allowed) {
    throw new ForbiddenAppException(`Access denied (${decision.Reason ?? 'OUT_OF_SCOPE'})`, {
      Reason: decision.Reason ?? 'OUT_OF_SCOPE',
      Action: action,
      ObjectType: ObjectType.Receipt,
    });
  }
};

export const CheckReceiptPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  receipt: ReceiptEntity,
): Promise<boolean> => {
  if (!permissionChecker || !actorUserId) return true;
  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.Receipt,
    Scope: { WarehouseId: receipt.WarehouseId, OwnerId: receipt.OwnerId },
  });
  return decision.Allowed;
};
