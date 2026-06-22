import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';

export const CheckInboundPlanPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  plan: InboundPlanEntity,
): Promise<boolean> => {
  if (!permissionChecker || !actorUserId) return true;
  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.InboundPlan,
    Scope: { WarehouseId: plan.WarehouseId, OwnerId: plan.OwnerId },
  });
  return decision.Allowed;
};

export const AssertInboundPlanPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  plan: InboundPlanEntity,
): Promise<void> => {
  const allowed = await CheckInboundPlanPermission(permissionChecker, actorUserId, action, plan);
  if (!allowed) {
    throw new ForbiddenAppException('Access denied (OUT_OF_SCOPE)', { Reason: 'OUT_OF_SCOPE' });
  }
};
