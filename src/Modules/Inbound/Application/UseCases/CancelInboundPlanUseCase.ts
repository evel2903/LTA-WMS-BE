import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { CancelInboundPlanDto, InboundPlanDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanDtoMapper } from '@modules/Inbound/Application/Mappers/InboundPlanDtoMapper';
import { AssertInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';

/**
 * IFB-24: soft-cancel (Draft -> Cancelled), NOT a hard delete -- matches the
 * only house precedent for this kind of action (OutboundOrderLifecycleService),
 * and reuses the ActionCode.DeleteCancel grant already provisioned on
 * ObjectType.InboundPlan. Only a still-Draft plan can be cancelled this way; a
 * confirmed plan already has real downstream state (CoreFlow, outbox event)
 * and is out of scope for this action.
 */
export class CancelInboundPlanUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: CancelInboundPlanDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundPlanDto> {
    // Fail-fast pre-check (no lock/transaction cost for a bad id or missing scope).
    const preCheck = await this.inboundPlans.FindById(request.Id);
    if (!preCheck) throw new NotFoundException('Inbound plan not found');
    await AssertInboundPlanPermission(
      this.permissionChecker,
      context.ActorUserId,
      ActionCode.DeleteCancel,
      preCheck.Plan,
    );

    // IFB-24 review fix: guard + mutation now run against a row locked via
    // FindByIdForUpdate (pessimistic_write) INSIDE this transaction -- see
    // ConfirmInboundPlanUseCase's identical fix for the race this closes.
    return this.audited.Run(async (manager) => {
      const aggregate = await this.inboundPlans.FindByIdForUpdate(request.Id, manager);
      if (!aggregate) throw new NotFoundException('Inbound plan not found');
      // Re-review fix (authorization TOCTOU): re-check permission against the LOCKED
      // (current) Warehouse/Owner scope -- see ConfirmInboundPlanUseCase's identical fix.
      await AssertInboundPlanPermission(
        this.permissionChecker,
        context.ActorUserId,
        ActionCode.DeleteCancel,
        aggregate.Plan,
      );
      if (aggregate.Plan.Status !== InboundPlanDocumentStatus.Draft) {
        throw new BusinessRuleException(
          `Chỉ phiếu ở trạng thái Draft mới xóa được (hiện tại: ${aggregate.Plan.Status})`,
        );
      }

      const before = InboundPlanDtoMapper.ToDto(aggregate);
      aggregate.Plan.Cancel({ UpdatedBy: context.ActorUserId });

      const updatedPlan = await this.inboundPlans.UpdatePlan(aggregate.Plan, manager);
      const result = InboundPlanDtoMapper.ToDto({ Plan: updatedPlan, Lines: aggregate.Lines });

      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.DeleteCancel,
          ObjectType: ObjectType.InboundPlan,
          ObjectId: aggregate.Plan.Id,
          ObjectCode: aggregate.Plan.BusinessReference,
          BeforeJson: before as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          ReferenceType: 'InboundPlanCancel',
          ReferenceId: aggregate.Plan.Id,
          WarehouseId: aggregate.Plan.WarehouseId,
          OwnerId: aggregate.Plan.OwnerId,
        }),
      };
    });
  }
}
