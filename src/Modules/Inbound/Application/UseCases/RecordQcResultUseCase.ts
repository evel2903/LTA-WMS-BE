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
import { QcResultDto, RecordQcResultDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertQcTaskPermission } from '@modules/Inbound/Application/Services/QcTaskPermission';
import { AssertInboundPlanNotCancelled } from '@modules/Inbound/Application/Services/InboundPlanStatusGuards';
import { QcResultEntity } from '@modules/Inbound/Domain/Entities/QcResultEntity';
import { QcTaskEntity } from '@modules/Inbound/Domain/Entities/QcTaskEntity';
import { QcDispositionCode } from '@modules/Inbound/Domain/Enums/QcDispositionCode';
import { QcResultStatus } from '@modules/Inbound/Domain/Enums/QcResultStatus';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';

const INVENTORY_READY_FOR_PUTAWAY = 'READY_FOR_PUTAWAY';
const INVENTORY_HOLD = 'HOLD';
const INVENTORY_QUARANTINE = 'QUARANTINE';
const INVENTORY_REJECTED = 'REJECTED';
const INVENTORY_DAMAGED = 'DAMAGED';

export class RecordQcResultUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: RecordQcResultDto, context: AuditContext = SystemAuditContext): Promise<QcResultDto> {
    this.AssertRequest(request);
    const task = await this.receiving.FindQcTaskById(request.QcTaskId);
    if (!task) throw new NotFoundException('QC task not found');

    const duplicate = await this.receiving.FindQcResultByIdempotencyKey(task.Id, request.IdempotencyKey);
    if (duplicate) {
      this.AssertDuplicateMatchesRequest(duplicate, request);
      return ReceivingDtoMapper.ToQcResultDto(duplicate, task.TaskStatus, true);
    }

    await AssertQcTaskPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, task);
    if (!task.Required || task.TaskStatus === QcTaskStatus.NotRequired) {
      throw new BusinessRuleException('QC result cannot be recorded for a skipped task');
    }
    if (task.TaskStatus === QcTaskStatus.Closed || task.TaskStatus === QcTaskStatus.Dispositioned) {
      throw new BusinessRuleException('QC task already has a recorded result');
    }
    if (request.InspectedQuantity > task.ActualQuantity) {
      throw new BusinessRuleException('QC inspected quantity exceeds task quantity');
    }

    const receipt = await this.receiving.FindReceiptById(task.ReceiptId);
    if (!receipt) throw new NotFoundException('Receipt not found for QC result');
    const aggregate = await this.inboundPlans.FindById(task.InboundPlanId);
    if (!aggregate) throw new NotFoundException('Inbound plan not found for QC result');
    // Re-review fix (P1): the plan can be cancelled AFTER its receiving session/receipt
    // was legitimately started (Draft is allowed to receive; Cancel only requires Draft),
    // so this QC-task-scoped use case must re-check the plan's CURRENT status itself.
    AssertInboundPlanNotCancelled(aggregate.Plan.Status);
    const reasonCodeId = await this.ValidateReasonIfNeeded(request);
    const status = this.ResolveInventoryStatuses(request);
    const now = new Date();
    const beforeTask = ReceivingDtoMapper.ToQcTaskDto(task);
    task.TaskStatus =
      request.ResultStatus === QcResultStatus.Passed && request.RejectedQuantity === 0
        ? QcTaskStatus.Closed
        : QcTaskStatus.Dispositioned;
    task.InventoryStatusCode = status.TargetInventoryStatusCode;
    task.TargetInventoryStatusCode = status.TargetInventoryStatusCode;
    task.UpdatedBy = context.ActorUserId;
    task.UpdatedAt = now;

    const result = new QcResultEntity({
      Id: randomUUID(),
      QcTaskId: task.Id,
      ReceiptId: task.ReceiptId,
      ReceiptLineId: task.ReceiptLineId,
      InboundPlanId: task.InboundPlanId,
      InboundPlanLineId: task.InboundPlanLineId,
      OwnerId: task.OwnerId,
      OwnerCode: task.OwnerCode,
      WarehouseId: task.WarehouseId,
      WarehouseCode: task.WarehouseCode,
      ResultStatus: request.ResultStatus,
      DispositionCode: request.DispositionCode,
      InspectedQuantity: request.InspectedQuantity,
      AcceptedQuantity: request.AcceptedQuantity,
      RejectedQuantity: request.RejectedQuantity,
      AcceptedInventoryStatusCode: status.AcceptedInventoryStatusCode,
      RejectedInventoryStatusCode: status.RejectedInventoryStatusCode,
      TargetInventoryStatusCode: status.TargetInventoryStatusCode,
      ReasonCode: request.ReasonCode?.trim() || null,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      EvidenceJson: request.EvidenceJson ?? null,
      IdempotencyKey: request.IdempotencyKey,
      RecordedAt: now,
      RecordedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const outbox = this.BuildQcResultOutbox(aggregate.Plan.BusinessReference, result, task);
    const milestone = receipt.CoreFlowInstanceId
      ? new WorkflowMilestoneEntity({
          Id: randomUUID(),
          CoreFlowInstanceId: receipt.CoreFlowInstanceId,
          StageCode: CoreFlowStageCode.Inbound,
          StepCode: CoreFlowStepCode.QcCompleted,
          MilestoneStatus: WorkflowMilestoneStatus.Completed,
          Metadata: {
            QcTaskId: task.Id,
            QcResultId: result.Id,
            ReceiptId: task.ReceiptId,
            ReceiptLineId: task.ReceiptLineId,
            ResultStatus: result.ResultStatus,
            DispositionCode: result.DispositionCode,
            TargetInventoryStatusCode: result.TargetInventoryStatusCode,
          },
          OccurredAt: now,
          CreatedBy: context.ActorUserId,
        })
      : null;

    try {
      return await this.audited.Run(async (manager) => {
        const createdResult = await this.receiving.CreateQcResult(result, manager);
        const updatedTask = await this.receiving.UpdateQcTask(task, manager);
        await this.integrations.CreateOutboxMessage(outbox, manager);
        if (milestone) await this.coreFlows.CreateMilestone(milestone, manager);
        const dto = ReceivingDtoMapper.ToQcResultDto(createdResult, updatedTask.TaskStatus);
        return {
          result: dto,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.QcTask,
            ObjectId: task.Id,
            ObjectCode: task.TriggerReason,
            BeforeJson: beforeTask as unknown as Record<string, unknown>,
            AfterJson: dto as unknown as Record<string, unknown>,
            ReasonCodeId: createdResult.ReasonCodeId,
            ReasonNote: createdResult.ReasonNote,
            EvidenceRefs: this.BuildAuditEvidence(createdResult),
            ReferenceType: 'QcResult',
            ReferenceId: createdResult.Id,
            WarehouseId: task.WarehouseId,
            OwnerId: task.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const concurrentDuplicate = await this.receiving.FindQcResultByIdempotencyKey(task.Id, request.IdempotencyKey);
        if (concurrentDuplicate) {
          this.AssertDuplicateMatchesRequest(concurrentDuplicate, request);
          return ReceivingDtoMapper.ToQcResultDto(concurrentDuplicate, task.TaskStatus, true);
        }
      }
      throw error;
    }
  }

  private AssertRequest(request: RecordQcResultDto): void {
    if (!request.QcTaskId?.trim()) throw new BusinessRuleException('QC task is required for result');
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('QC result idempotency key is required');
    if (request.InspectedQuantity <= 0) throw new BusinessRuleException('Inspected quantity must be positive');
    if (request.AcceptedQuantity < 0 || request.RejectedQuantity < 0) {
      throw new BusinessRuleException('QC accepted/rejected quantity cannot be negative');
    }
    if (request.AcceptedQuantity + request.RejectedQuantity <= 0) {
      throw new BusinessRuleException('QC result quantity is required');
    }
    if (request.AcceptedQuantity + request.RejectedQuantity !== request.InspectedQuantity) {
      throw new BusinessRuleException('QC accepted/rejected quantity must equal inspected quantity');
    }
    if (request.ResultStatus === QcResultStatus.Passed) {
      if (request.DispositionCode !== QcDispositionCode.Release || request.RejectedQuantity !== 0) {
        throw new BusinessRuleException('Passed QC result must release all inspected quantity');
      }
    }
    if (request.ResultStatus === QcResultStatus.Failed && request.DispositionCode === QcDispositionCode.Release) {
      throw new BusinessRuleException('Failed QC result cannot release disposition');
    }
  }

  private async ValidateReasonIfNeeded(request: RecordQcResultDto): Promise<string | null> {
    if (!this.NeedsReasonAndEvidence(request)) {
      if (!request.ReasonCode?.trim()) return null;
      return (
        await this.reasonCatalog.ValidateReason({
          ReasonCode: request.ReasonCode,
          Action: ActionCode.Update,
          ObjectType: ObjectType.QcTask,
        })
      ).ReasonCodeId;
    }
    if (!request.ReasonCode?.trim()) throw new BusinessRuleException('QC disposition reason is required');
    if (!this.HasEvidence(request)) throw new BusinessRuleException('QC disposition evidence is required');
    return (
      await this.reasonCatalog.ValidateReason({
        ReasonCode: request.ReasonCode,
        Action: ActionCode.Update,
        ObjectType: ObjectType.QcTask,
      })
    ).ReasonCodeId;
  }

  private NeedsReasonAndEvidence(request: RecordQcResultDto): boolean {
    return (
      request.ResultStatus !== QcResultStatus.Passed ||
      request.DispositionCode !== QcDispositionCode.Release ||
      request.RejectedQuantity > 0
    );
  }

  private HasEvidence(request: RecordQcResultDto): boolean {
    return Boolean(
      (request.EvidenceRefs?.some((item) => typeof item === 'string' && item.trim().length > 0) ?? false) ||
      (request.EvidenceJson && Object.keys(request.EvidenceJson).length > 0),
    );
  }

  private ResolveInventoryStatuses(request: RecordQcResultDto): {
    AcceptedInventoryStatusCode: string | null;
    RejectedInventoryStatusCode: string | null;
    TargetInventoryStatusCode: string;
  } {
    const blockedStatus = this.BlockedStatusForDisposition(request.DispositionCode);
    const acceptedStatus = request.AcceptedQuantity > 0 ? INVENTORY_READY_FOR_PUTAWAY : null;
    const rejectedStatus = request.RejectedQuantity > 0 ? blockedStatus : null;
    return {
      AcceptedInventoryStatusCode: acceptedStatus,
      RejectedInventoryStatusCode: rejectedStatus,
      TargetInventoryStatusCode: rejectedStatus ?? acceptedStatus ?? INVENTORY_READY_FOR_PUTAWAY,
    };
  }

  private BlockedStatusForDisposition(disposition: QcDispositionCode): string {
    if (disposition === QcDispositionCode.Hold) return INVENTORY_HOLD;
    if (disposition === QcDispositionCode.Quarantine) return INVENTORY_QUARANTINE;
    if (disposition === QcDispositionCode.Reject) return INVENTORY_REJECTED;
    if (disposition === QcDispositionCode.Damage) return INVENTORY_DAMAGED;
    return INVENTORY_READY_FOR_PUTAWAY;
  }

  private AssertDuplicateMatchesRequest(duplicate: QcResultEntity, request: RecordQcResultDto): void {
    if (duplicate.ResultStatus !== request.ResultStatus || duplicate.DispositionCode !== request.DispositionCode) {
      throw new ConflictException('QC result idempotency key already used for a different result');
    }
  }

  private BuildAuditEvidence(result: QcResultEntity): string[] | null {
    const refs = [...result.EvidenceRefs];
    if (result.EvidenceJson && Object.keys(result.EvidenceJson).length > 0) {
      refs.push(JSON.stringify(result.EvidenceJson));
    }
    return refs.length ? refs : null;
  }

  private BuildQcResultOutbox(
    businessReference: string,
    result: QcResultEntity,
    task: QcTaskEntity,
  ): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: randomUUID(),
      MessageId: `QCResultRecorded:${task.Id}:${result.IdempotencyKey}`,
      EventType: 'QCResultRecorded',
      Version: '1.0',
      BusinessReference: businessReference,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: task.WarehouseCode ?? task.WarehouseId,
      OwnerContext: task.OwnerCode ?? task.OwnerId,
      EventTime: result.RecordedAt,
      CorrelationId: task.ReceiptId,
      CausationId: result.Id,
      Payload: {
        QcTaskId: task.Id,
        QcResultId: result.Id,
        ReceiptId: task.ReceiptId,
        ReceiptLineId: task.ReceiptLineId,
        InboundPlanId: task.InboundPlanId,
        ResultStatus: result.ResultStatus,
        DispositionCode: result.DispositionCode,
        AcceptedQuantity: result.AcceptedQuantity,
        RejectedQuantity: result.RejectedQuantity,
        AcceptedInventoryStatusCode: result.AcceptedInventoryStatusCode,
        RejectedInventoryStatusCode: result.RejectedInventoryStatusCode,
        TargetInventoryStatusCode: result.TargetInventoryStatusCode,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: result.RecordedBy,
    });
  }
}
