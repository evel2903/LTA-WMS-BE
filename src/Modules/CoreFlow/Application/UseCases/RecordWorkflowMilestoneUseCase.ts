import { randomUUID } from 'crypto';
import { NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { RecordWorkflowMilestoneDto, WorkflowMilestoneDto } from '@modules/CoreFlow/Application/DTOs/CoreFlowDtos';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowDtoMapper } from '@modules/CoreFlow/Application/Mappers/CoreFlowDtoMapper';
import { CoreFlowValidation } from '@modules/CoreFlow/Application/UseCases/CoreFlowValidation';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';

export class RecordWorkflowMilestoneUseCase {
  constructor(
    private readonly coreFlows: ICoreFlowRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: RecordWorkflowMilestoneDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WorkflowMilestoneDto> {
    CoreFlowValidation.AssertStepBelongsToStage(request.StepCode, request.StageCode);
    CoreFlowValidation.AssertInventoryStatusCode(request.InventoryStatusCode);

    const instance = await this.coreFlows.FindInstanceById(request.CoreFlowInstanceId);
    if (!instance) throw new NotFoundException('CoreFlow instance not found');

    const milestone = new WorkflowMilestoneEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: request.CoreFlowInstanceId,
      StageCode: request.StageCode,
      StepCode: request.StepCode,
      MilestoneStatus: request.MilestoneStatus,
      InventoryStatusCode: request.InventoryStatusCode ?? null,
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
