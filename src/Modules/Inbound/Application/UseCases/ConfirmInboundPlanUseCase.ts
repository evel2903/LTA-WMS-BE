import { randomUUID } from 'crypto';
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
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ConfirmInboundPlanDto, InboundPlanDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanDtoMapper } from '@modules/Inbound/Application/Mappers/InboundPlanDtoMapper';
import { AssertInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';

/**
 * IFB-24: Draft -> Planned. The CoreFlowInstance + 'InboundPlanReceived' outbox
 * event that CreateInboundPlanUseCase used to create eagerly now happen HERE --
 * a Draft plan isn't "real" to the outside world yet, so nothing should be
 * emitted for it until an operator explicitly confirms it.
 */
export class ConfirmInboundPlanUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: ConfirmInboundPlanDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundPlanDto> {
    // Fail-fast pre-check (no lock/transaction cost for a bad id or missing scope).
    const preCheck = await this.inboundPlans.FindById(request.Id);
    if (!preCheck) throw new NotFoundException('Inbound plan not found');
    await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, preCheck.Plan);

    // IFB-24 review fix: the actual Draft guard + mutation + CoreFlow/outbox creation
    // now all run against a row locked via FindByIdForUpdate (pessimistic_write) INSIDE
    // this transaction -- two concurrent Confirm calls on the same plan can no longer
    // both read Status=Draft before either commits and each create their own CoreFlow
    // instance + outbox event. The second call blocks on the lock, then re-reads the
    // now-Planned status and correctly rejects.
    return this.audited.Run(async (manager) => {
      const aggregate = await this.inboundPlans.FindByIdForUpdate(request.Id, manager);
      if (!aggregate) throw new NotFoundException('Inbound plan not found');
      // Re-review fix (authorization TOCTOU): re-check permission against the LOCKED
      // (current) Warehouse/Owner scope -- the pre-check above only proved the actor
      // could touch the plan's scope at read time; a concurrent Update could have moved
      // it to a different Warehouse/Owner in the race window before this lock.
      await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, aggregate.Plan);
      if (aggregate.Plan.Status !== InboundPlanDocumentStatus.Draft) {
        throw new BusinessRuleException(
          `Chỉ phiếu ở trạng thái Draft mới xác nhận được (hiện tại: ${aggregate.Plan.Status})`,
        );
      }

      const before = InboundPlanDtoMapper.ToDto(aggregate);
      const now = new Date();
      const coreFlowId = randomUUID();
      aggregate.Plan.Confirm({ UpdatedBy: context.ActorUserId });
      aggregate.Plan.CoreFlowInstanceId = coreFlowId;

      const coreFlow = new CoreFlowInstanceEntity({
        Id: coreFlowId,
        BusinessReference: aggregate.Plan.BusinessReference,
        SourceSystem: aggregate.Plan.SourceSystem,
        WarehouseCode: aggregate.Plan.WarehouseCode ?? '',
        OwnerCode: aggregate.Plan.OwnerCode,
        CorrelationId: randomUUID(),
        CurrentStage: CoreFlowStageCode.Inbound,
        Status: CoreFlowInstanceStatus.Active,
        Metadata: { InboundPlanId: aggregate.Plan.Id, SourceDocumentType: aggregate.Plan.SourceDocumentType },
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: context.ActorUserId,
      });
      const outbox = new OutboxMessageEntity({
        Id: randomUUID(),
        MessageId: `InboundPlanReceived:${aggregate.Plan.Id}`,
        EventType: 'InboundPlanReceived',
        Version: '1.0',
        BusinessReference: aggregate.Plan.BusinessReference,
        SourceSystem: 'LTA-WMS',
        TargetSystem: aggregate.Plan.SourceSystem,
        WarehouseContext: aggregate.Plan.WarehouseCode ?? '',
        OwnerContext: aggregate.Plan.OwnerCode,
        EventTime: now,
        CorrelationId: coreFlow.CorrelationId,
        CausationId: aggregate.Plan.Id,
        Payload: { InboundPlanId: aggregate.Plan.Id, SourceDocumentNumber: aggregate.Plan.SourceDocumentNumber },
        Status: OutboxMessageStatus.Pending,
        CreatedAt: now,
        CreatedBy: context.ActorUserId,
      });

      const updatedPlan = await this.inboundPlans.UpdatePlan(aggregate.Plan, manager);
      await this.coreFlows.CreateInstance(coreFlow, manager);
      await this.integrations.CreateOutboxMessage(outbox, manager);
      const result = InboundPlanDtoMapper.ToDto({ Plan: updatedPlan, Lines: aggregate.Lines });

      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.InboundPlan,
          ObjectId: aggregate.Plan.Id,
          ObjectCode: aggregate.Plan.BusinessReference,
          BeforeJson: before as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          ReferenceType: 'InboundPlanConfirm',
          ReferenceId: aggregate.Plan.Id,
          WarehouseId: aggregate.Plan.WarehouseId,
          OwnerId: aggregate.Plan.OwnerId,
        }),
      };
    });
  }
}
