import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { EvaluateQcTaskDto, QcTaskDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertQcTaskPermission } from '@modules/Inbound/Application/Services/QcTaskPermission';
import { QcTaskEntity } from '@modules/Inbound/Domain/Entities/QcTaskEntity';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';

const INVENTORY_PENDING_QC = 'PENDING_QC';
const INVENTORY_READY_FOR_PUTAWAY = 'READY_FOR_PUTAWAY';

export class EvaluateQcTaskUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly skus: ISkuRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: EvaluateQcTaskDto, context: AuditContext = SystemAuditContext): Promise<QcTaskDto> {
    this.AssertRequest(request);
    const receipt = await this.receiving.FindReceiptById(request.ReceiptId);
    if (!receipt) throw new NotFoundException('Receipt not found');

    const duplicate = await this.receiving.FindQcTaskByIdempotencyKey(receipt.Id, request.IdempotencyKey);
    if (duplicate) {
      this.AssertDuplicateMatchesRequest(duplicate, request);
      return ReceivingDtoMapper.ToQcTaskDto(duplicate, true);
    }

    await AssertQcTaskPermission(this.permissionChecker, context.ActorUserId, ActionCode.Create, receipt);

    const line = await this.receiving.FindReceiptLineById(request.ReceiptLineId);
    if (!line || line.ReceiptId !== receipt.Id) throw new BusinessRuleException('Receipt line not found for QC');

    const aggregate = await this.inboundPlans.FindById(receipt.InboundPlanId);
    if (!aggregate) throw new NotFoundException('Inbound plan not found for QC');
    const planLine = aggregate.Lines.find((item) => item.Id === line.InboundPlanLineId);
    if (!planLine) throw new BusinessRuleException('Inbound plan line not found for QC');

    const profile = aggregate.Plan.WarehouseProfileId
      ? await this.profiles.FindById(aggregate.Plan.WarehouseProfileId)
      : null;
    const sku = await this.skus.FindById(line.SkuId);
    const decision = this.DecideRequirement(request, line.DiscrepancySignals.length > 0, sku?.QcRequired ?? false, {
      ...(profile?.StrategyPolicy ?? {}),
      ...(profile?.ThresholdPolicy ?? {}),
    });
    const reasonCodeId = request.ReasonCode?.trim()
      ? (
          await this.reasonCatalog.ValidateReason({
            ReasonCode: request.ReasonCode,
            Action: ActionCode.Create,
            ObjectType: ObjectType.QcTask,
          })
        ).ReasonCodeId
      : null;
    const now = new Date();
    const task = new QcTaskEntity({
      Id: randomUUID(),
      ReceiptId: receipt.Id,
      ReceiptLineId: line.Id,
      InboundPlanId: receipt.InboundPlanId,
      InboundPlanLineId: line.InboundPlanLineId,
      OwnerId: receipt.OwnerId,
      OwnerCode: receipt.OwnerCode,
      WarehouseId: receipt.WarehouseId,
      WarehouseCode: receipt.WarehouseCode,
      SkuId: line.SkuId,
      SkuCode: line.SkuCode,
      UomId: line.UomId,
      UomCode: line.UomCode,
      ActualQuantity: line.ActualQuantity,
      TaskStatus: decision.Required ? QcTaskStatus.PendingQc : QcTaskStatus.NotRequired,
      Required: decision.Required,
      TriggerReason: decision.TriggerReason,
      TriggerPolicyJson: decision.PolicySnapshot,
      InventoryStatusCode: decision.Required ? INVENTORY_PENDING_QC : INVENTORY_READY_FOR_PUTAWAY,
      TargetInventoryStatusCode: decision.Required ? null : INVENTORY_READY_FOR_PUTAWAY,
      ReasonCode: request.ReasonCode?.trim() || null,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      IdempotencyKey: request.IdempotencyKey,
      CreatedBy: context.ActorUserId,
      UpdatedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const outbox = task.Required ? this.BuildQcRequiredOutbox(aggregate.Plan.BusinessReference, task) : null;
    const milestone =
      !task.Required && receipt.CoreFlowInstanceId
        ? new WorkflowMilestoneEntity({
            Id: randomUUID(),
            CoreFlowInstanceId: receipt.CoreFlowInstanceId,
            StageCode: CoreFlowStageCode.Inbound,
            StepCode: CoreFlowStepCode.QcCompleted,
            MilestoneStatus: WorkflowMilestoneStatus.Skipped,
            Metadata: {
              ReceiptId: receipt.Id,
              ReceiptLineId: line.Id,
              QcTaskId: task.Id,
              TriggerReason: task.TriggerReason,
              InventoryStatusCode: task.InventoryStatusCode,
            },
            OccurredAt: now,
            CreatedBy: context.ActorUserId,
          })
        : null;

    try {
      return await this.audited.Run(async (manager) => {
        const createdTask = await this.receiving.CreateQcTask(task, manager);
        if (outbox) await this.integrations.CreateOutboxMessage(outbox, manager);
        if (milestone) await this.coreFlows.CreateMilestone(milestone, manager);
        const result = ReceivingDtoMapper.ToQcTaskDto(createdTask);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.QcTask,
            ObjectId: createdTask.Id,
            ObjectCode: createdTask.TriggerReason,
            AfterJson: result as unknown as Record<string, unknown>,
            ReasonCodeId: createdTask.ReasonCodeId,
            ReasonNote: createdTask.ReasonNote,
            EvidenceRefs: createdTask.EvidenceRefs.length ? createdTask.EvidenceRefs : null,
            ReferenceType: 'QcTask',
            ReferenceId: createdTask.Id,
            WarehouseId: receipt.WarehouseId,
            OwnerId: receipt.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const concurrentDuplicate = await this.receiving.FindQcTaskByIdempotencyKey(receipt.Id, request.IdempotencyKey);
        if (concurrentDuplicate) {
          this.AssertDuplicateMatchesRequest(concurrentDuplicate, request);
          return ReceivingDtoMapper.ToQcTaskDto(concurrentDuplicate, true);
        }
      }
      throw error;
    }
  }

  private AssertRequest(request: EvaluateQcTaskDto): void {
    if (!request.ReceiptId?.trim()) throw new BusinessRuleException('Receipt is required for QC task');
    if (!request.ReceiptLineId?.trim()) throw new BusinessRuleException('Receipt line is required for QC task');
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('QC task idempotency key is required');
  }

  private AssertDuplicateMatchesRequest(duplicate: QcTaskEntity, request: EvaluateQcTaskDto): void {
    if (duplicate.ReceiptLineId !== request.ReceiptLineId) {
      throw new ConflictException('QC task idempotency key already used for a different receipt line');
    }
  }

  private DecideRequirement(
    request: EvaluateQcTaskDto,
    hasDiscrepancy: boolean,
    skuRequiresQc: boolean,
    policy: Record<string, unknown>,
  ): { Required: boolean; TriggerReason: string; PolicySnapshot: Record<string, unknown> } {
    const forceRequired = request.ForceRequired === true;
    const profileRequiresQc = this.BoolPolicy(policy.inboundQcRequired) || this.BoolPolicy(policy.qcRequired);
    const samplePercent = this.NumberPolicy(policy.qcSamplePercent);
    const samplingRequiresQc = samplePercent !== null && samplePercent > 0;
    const required = forceRequired || hasDiscrepancy || skuRequiresQc || profileRequiresQc || samplingRequiresQc;
    let trigger = 'NotRequired';
    if (forceRequired) trigger = 'Forced';
    else if (hasDiscrepancy) trigger = 'Discrepancy';
    else if (skuRequiresQc) trigger = 'SkuPolicy';
    else if (profileRequiresQc) trigger = 'WarehouseProfile';
    else if (samplingRequiresQc) trigger = 'SamplingPolicy';
    return {
      Required: required,
      TriggerReason: trigger,
      PolicySnapshot: {
        ForceRequired: forceRequired,
        HasDiscrepancy: hasDiscrepancy,
        SkuRequiresQc: skuRequiresQc,
        InboundQcRequired: profileRequiresQc,
        QcSamplePercent: samplePercent,
      },
    };
  }

  private BoolPolicy(value: unknown): boolean {
    return value === true || String(value).toLowerCase() === 'true';
  }

  private NumberPolicy(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private BuildQcRequiredOutbox(businessReference: string, task: QcTaskEntity): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: randomUUID(),
      MessageId: `QCRequired:${task.ReceiptId}:${task.IdempotencyKey}`,
      EventType: 'QCRequired',
      Version: '1.0',
      BusinessReference: businessReference,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: task.WarehouseCode ?? task.WarehouseId,
      OwnerContext: task.OwnerCode ?? task.OwnerId,
      EventTime: task.CreatedAt,
      CorrelationId: task.ReceiptId,
      CausationId: task.Id,
      Payload: {
        QcTaskId: task.Id,
        ReceiptId: task.ReceiptId,
        ReceiptLineId: task.ReceiptLineId,
        InboundPlanId: task.InboundPlanId,
        TriggerReason: task.TriggerReason,
        InventoryStatusCode: task.InventoryStatusCode,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: task.CreatedBy,
    });
  }
}
