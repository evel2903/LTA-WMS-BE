import { randomUUID } from 'crypto';
import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { SkipCoreFlowStepDto, WorkflowMilestoneDto } from '@modules/CoreFlow/Application/DTOs/CoreFlowDtos';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowDtoMapper } from '@modules/CoreFlow/Application/Mappers/CoreFlowDtoMapper';
import { CoreFlowValidation } from '@modules/CoreFlow/Application/UseCases/CoreFlowValidation';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';

export class SkipCoreFlowStepUseCase {
  constructor(
    private readonly coreFlows: ICoreFlowRepository,
    private readonly auditedTransaction?: AuditedTransaction,
    private readonly reasonCatalog?: IReasonCodeCatalog,
  ) {}

  public async Execute(
    request: SkipCoreFlowStepDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WorkflowMilestoneDto> {
    CoreFlowValidation.AssertStepBelongsToStage(request.StepCode, request.StageCode);
    if (!request.ReasonCode?.trim()) {
      throw new BusinessRuleException('Skipping a CoreFlow step requires a reason code');
    }

    const instance = await this.coreFlows.FindInstanceById(request.CoreFlowInstanceId);
    if (!instance) throw new NotFoundException('CoreFlow instance not found');

    const reason = this.reasonCatalog
      ? await this.reasonCatalog.ValidateReason({
          ReasonCode: request.ReasonCode,
          Action: ActionCode.Update,
          ObjectType: ObjectType.CoreFlow,
        })
      : { ReasonCodeId: request.ReasonCode };

    const milestone = new WorkflowMilestoneEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: request.CoreFlowInstanceId,
      StageCode: request.StageCode,
      StepCode: request.StepCode,
      MilestoneStatus: WorkflowMilestoneStatus.Skipped,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      ExceptionCaseId: request.ExceptionCaseId ?? null,
      Metadata: request.Metadata ?? null,
      OccurredAt: new Date(),
      CreatedBy: context.ActorUserId,
    });

    const buildEntry = (created: WorkflowMilestoneEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.CoreFlow,
        ObjectId: instance.Id,
        ObjectCode: instance.BusinessReference,
        AfterJson: CoreFlowDtoMapper.ToMilestoneDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: request.ReasonNote ?? null,
        WarehouseId: instance.WarehouseCode,
        OwnerId: instance.OwnerCode,
        ReferenceType: 'WorkflowMilestone',
        ReferenceId: created.Id,
      });

    if (!this.auditedTransaction) {
      const created = await this.coreFlows.CreateMilestone(milestone);
      return CoreFlowDtoMapper.ToMilestoneDto(created);
    }

    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.coreFlows.CreateMilestone(milestone, manager);
      return { result: CoreFlowDtoMapper.ToMilestoneDto(created), entry: buildEntry(created) };
    });
  }
}
