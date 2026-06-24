import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export interface OutboundOrderScope {
  WarehouseId?: string | null;
  OwnerId?: string | null;
}

export async function AssertOutboundOrderPermission(
  checker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: OutboundOrderScope,
): Promise<void> {
  if (!actorUserId) throw new ForbiddenAppException('Authenticated actor is required');
  if (!checker) return;
  const decision = await checker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.OutboundOrder,
    Scope: { WarehouseId: scope.WarehouseId ?? null, OwnerId: scope.OwnerId ?? null },
  });
  if (!decision.Allowed) {
    throw new ForbiddenAppException('Permission denied for outbound order action', {
      Action: action,
      ObjectType: ObjectType.OutboundOrder,
      Reason: decision.Reason ?? 'PERMISSION_DENIED',
    });
  }
}

export async function CheckOutboundOrderPermission(
  checker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: OutboundOrderScope,
): Promise<boolean> {
  try {
    await AssertOutboundOrderPermission(checker, actorUserId, action, scope);
    return true;
  } catch {
    return false;
  }
}
