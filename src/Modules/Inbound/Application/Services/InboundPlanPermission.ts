import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

// IFB-24 review fix: loosened from `plan: InboundPlanEntity` to a structural scope
// shape. Every existing call site still passes a full InboundPlanEntity (it satisfies
// this shape), but UpdateInboundPlanUseCase now also needs to check permission against
// a NEW WarehouseId/OwnerId pair that has no InboundPlanEntity to attach to yet.
export interface InboundPlanScope {
  WarehouseId: string;
  OwnerId: string;
}

export const CheckInboundPlanPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: InboundPlanScope,
): Promise<boolean> => {
  if (!permissionChecker || !actorUserId) return true;
  const decision = await permissionChecker.Check({
    UserId: actorUserId,
    Action: action,
    ObjectType: ObjectType.InboundPlan,
    Scope: { WarehouseId: scope.WarehouseId, OwnerId: scope.OwnerId },
  });
  return decision.Allowed;
};

export const AssertInboundPlanPermission = async (
  permissionChecker: IPermissionChecker | undefined,
  actorUserId: string | null | undefined,
  action: ActionCode,
  scope: InboundPlanScope,
): Promise<void> => {
  const allowed = await CheckInboundPlanPermission(permissionChecker, actorUserId, action, scope);
  if (!allowed) {
    throw new ForbiddenAppException('Access denied (OUT_OF_SCOPE)', { Reason: 'OUT_OF_SCOPE' });
  }
};
