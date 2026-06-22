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
import { CreateWorkflowHandoffDto, WorkflowHandoffDto } from '@modules/CoreFlow/Application/DTOs/CoreFlowDtos';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowDtoMapper } from '@modules/CoreFlow/Application/Mappers/CoreFlowDtoMapper';
import { CoreFlowValidation } from '@modules/CoreFlow/Application/UseCases/CoreFlowValidation';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowHandoffStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowHandoffStatus';

export class CreateWorkflowHandoffUseCase {
  constructor(
    private readonly coreFlows: ICoreFlowRepository,
    private readonly auditedTransaction?: AuditedTransaction,
    private readonly reasonCatalog?: IReasonCodeCatalog,
  ) {}

  public async Execute(
    request: CreateWorkflowHandoffDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WorkflowHandoffDto> {
    const instance = await this.coreFlows.FindInstanceById(request.CoreFlowInstanceId);
    if (!instance) throw new NotFoundException('CoreFlow instance not found');

    const previousStage = CoreFlowValidation.PreviousStageFor(request.ToStage);
    const milestones = previousStage ? await this.coreFlows.ListMilestones({ CoreFlowInstanceId: instance.Id }) : [];
    const previousComplete = !previousStage || CoreFlowValidation.IsStageComplete(previousStage, milestones);
    const forced = request.Force === true;
    const blocked = !previousComplete && !forced;
    const needsReason = blocked || forced;
    if (needsReason && !request.ReasonCode?.trim()) {
      throw new BusinessRuleException('Blocked or forced CoreFlow handoff requires a reason code');
    }

    const reason = request.ReasonCode
      ? this.reasonCatalog
        ? await this.reasonCatalog.ValidateReason({
            ReasonCode: request.ReasonCode,
            Action: forced ? ActionCode.Override : ActionCode.Update,
            ObjectType: ObjectType.CoreFlow,
          })
        : { ReasonCodeId: request.ReasonCode }
      : { ReasonCodeId: null };

    const blockedReason = blocked ? `${previousStage} stage is not complete` : null;
    const handoff = new WorkflowHandoffEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: instance.Id,
      FromStage: request.FromStage,
      ToStage: request.ToStage,
      HandoffStatus: blocked ? WorkflowHandoffStatus.Blocked : WorkflowHandoffStatus.Completed,
      BlockedReason: blockedReason,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      Metadata: request.Metadata ?? null,
      OccurredAt: new Date(),
      CreatedBy: context.ActorUserId,
    });

    const beforeInstance = CoreFlowDtoMapper.ToInstanceDto(instance) as unknown as Record<string, unknown>;
    const buildEntry = (created: WorkflowHandoffEntity) =>
      MergeAuditContext(context, {
        Action: forced ? ActionCode.Override : ActionCode.Update,
        ObjectType: ObjectType.CoreFlow,
        ObjectId: instance.Id,
        ObjectCode: instance.BusinessReference,
        BeforeJson: beforeInstance,
        AfterJson: CoreFlowDtoMapper.ToHandoffDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: request.ReasonNote ?? null,
        WarehouseId: instance.WarehouseCode,
        OwnerId: instance.OwnerCode,
        ReferenceType: 'WorkflowHandoff',
        ReferenceId: created.Id,
      });

    const write = async (manager?: Parameters<ICoreFlowRepository['CreateHandoff']>[1]) => {
      const created = await this.coreFlows.CreateHandoff(handoff, manager);
      if (!blocked) {
        instance.PromoteTo(request.ToStage, context.ActorUserId);
        await this.coreFlows.UpdateInstance(instance, manager);
      }
      return created;
    };

    if (!this.auditedTransaction) {
      const created = await write();
      return CoreFlowDtoMapper.ToHandoffDto(created);
    }

    return this.auditedTransaction.Run(async (manager) => {
      const created = await write(manager);
      return { result: CoreFlowDtoMapper.ToHandoffDto(created), entry: buildEntry(created) };
    });
  }
}
