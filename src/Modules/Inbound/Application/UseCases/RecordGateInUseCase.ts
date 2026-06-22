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
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { InboundPlanDto, RecordGateInDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanDtoMapper } from '@modules/Inbound/Application/Mappers/InboundPlanDtoMapper';
import { AssertInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';

export class RecordGateInUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: RecordGateInDto, context: AuditContext = SystemAuditContext): Promise<InboundPlanDto> {
    const aggregate = await this.inboundPlans.FindById(request.Id);
    if (!aggregate) throw new NotFoundException('Inbound plan not found');
    await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, aggregate.Plan);

    if (aggregate.Plan.GateInStatus === InboundGateInStatus.Recorded) {
      if (aggregate.Plan.GateReference === request.GateReference) {
        return InboundPlanDtoMapper.ToDto(aggregate);
      }
      throw new BusinessRuleException('Gate-in has already been recorded for this inbound plan');
    }

    const before = InboundPlanDtoMapper.ToDto(aggregate);
    aggregate.Plan.RecordGateIn({
      GateInAt: new Date(request.GateInAt),
      GateReference: request.GateReference,
      VehicleNumber: request.VehicleNumber ?? null,
      DriverName: request.DriverName ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      UpdatedBy: context.ActorUserId,
    });

    const write = async (manager?: Parameters<IInboundPlanRepository['UpdatePlan']>[1]) => {
      const updatedPlan = await this.inboundPlans.UpdatePlan(aggregate.Plan, manager);
      if (updatedPlan.CoreFlowInstanceId) {
        await this.coreFlows.CreateMilestone(
          new WorkflowMilestoneEntity({
            Id: randomUUID(),
            CoreFlowInstanceId: updatedPlan.CoreFlowInstanceId,
            StageCode: CoreFlowStageCode.Inbound,
            StepCode: CoreFlowStepCode.GateInRecorded,
            MilestoneStatus: WorkflowMilestoneStatus.Completed,
            Metadata: { GateReference: updatedPlan.GateReference, GateInAt: updatedPlan.GateInAt },
            OccurredAt: updatedPlan.GateInAt ?? new Date(),
            CreatedBy: context.ActorUserId,
          }),
          manager,
        );
      }
      return InboundPlanDtoMapper.ToDto({ Plan: updatedPlan, Lines: aggregate.Lines });
    };

    return this.audited.Run(async (manager) => {
      const result = await write(manager);
      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.InboundPlan,
          ObjectId: aggregate.Plan.Id,
          ObjectCode: aggregate.Plan.BusinessReference,
          BeforeJson: before as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          EvidenceRefs: request.EvidenceRefs ?? null,
          ReferenceType: 'InboundGateIn',
          ReferenceId: aggregate.Plan.Id,
          WarehouseId: aggregate.Plan.WarehouseId,
          OwnerId: aggregate.Plan.OwnerId,
        }),
      };
    });
  }
}
