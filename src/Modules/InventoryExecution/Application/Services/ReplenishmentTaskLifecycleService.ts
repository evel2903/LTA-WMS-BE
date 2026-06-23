import { createHash, randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import {
  CancelReplenishmentTaskDto,
  ConfirmReplenishmentTaskDto,
  InventoryReconciliationFailureResultDto,
  ListReplenishmentTasksDto,
  ListReplenishmentTasksResultDto,
  RecordInventoryReconciliationFailureDto,
  ReleaseReplenishmentTaskDto,
  ReplenishmentMutationResultDto,
} from '@modules/InventoryExecution/Application/DTOs/ReplenishmentTaskDto';
import { InventoryControlResultDto } from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';
import { IReplenishmentTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IReplenishmentTaskRepository';
import { ReplenishmentTaskDtoMapper } from '@modules/InventoryExecution/Application/Mappers/ReplenishmentTaskDtoMapper';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { ReplenishmentTaskEntity } from '@modules/InventoryExecution/Domain/Entities/ReplenishmentTaskEntity';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

interface ReasonDecision {
  ReasonCode: string;
  ReasonCodeId: string;
}

interface BalanceContext {
  Balance: InventoryBalanceEntity;
  Dimension: InventoryDimensionEntity;
  Status: InventoryStatusEntity;
  Location: LocationEntity;
}

interface TargetEligibility {
  Target: LocationEntity;
  Profile: LocationProfileEntity | null;
  CurrentQuantity: number;
  Coverage: ItemCoverageEntity | null;
  Decision: Record<string, unknown>;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const RECONCILIATION_EXCEPTION_TYPE = 'CTRL-V1-INVENTORY-RECONCILIATION';
const RECONCILIATION_REFERENCE_TYPE = 'InventoryReconciliationFailure';

export class ReplenishmentTaskLifecycleService {
  constructor(
    private readonly replenishmentTasks: IReplenishmentTaskRepository,
    private readonly inventoryControl: InventoryControlUseCase,
    private readonly inventoryBalances: IInventoryBalanceRepository,
    private readonly inventoryDimensions: IInventoryDimensionRepository,
    private readonly inventoryStatuses: IInventoryStatusRepository,
    private readonly locations: ILocationRepository,
    private readonly locationProfiles: ILocationProfileRepository,
    private readonly itemCoverages: IItemCoverageRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly exceptionCases: IExceptionCaseRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Release(
    request: ReleaseReplenishmentTaskDto,
    context: AuditContext,
  ): Promise<ReplenishmentMutationResultDto> {
    const normalized = this.NormalizeRelease(request);
    const fingerprint = this.Fingerprint('ReleaseReplenishmentTask', normalized);
    const existing = await this.replenishmentTasks.FindByReleaseIdempotencyKey(normalized.IdempotencyKey);
    if (existing) {
      await this.AssertPermission(context, ActionCode.Create, ObjectType.ReplenishmentTask, existing);
      this.AssertSameFingerprint(existing.ReleasePayloadFingerprint, fingerprint);
      return this.BuildReleaseDuplicateResult(existing);
    }

    const source = await this.LoadSource(normalized.SourceBalanceId);
    await this.AssertPermission(context, ActionCode.Create, ObjectType.ReplenishmentTask, source.Dimension);
    if (source.Status.StatusCode !== 'AVAILABLE') {
      throw new BusinessRuleException('Replenishment source balance must be AVAILABLE', {
        SourceBalanceId: source.Balance.Id,
        SourceInventoryStatusCode: source.Status.StatusCode,
      });
    }
    const openSourceQuantity = await this.replenishmentTasks.SumOpenSourceQuantity(source.Balance.Id);
    const availableAfterOpenReplenishment = source.Balance.QtyAvailable - openSourceQuantity;
    if (availableAfterOpenReplenishment < normalized.Quantity) {
      throw new BusinessRuleException('Replenishment source QtyAvailable is insufficient', {
        SourceBalanceId: source.Balance.Id,
        QtyAvailable: source.Balance.QtyAvailable,
        OpenReplenishmentQuantity: openSourceQuantity,
        Quantity: normalized.Quantity,
      });
    }
    if (
      normalized.TriggerType === ReplenishmentTriggerType.EmergencyShortPick &&
      !normalized.ShortPickReference &&
      (normalized.EvidenceRefs ?? []).length === 0
    ) {
      throw new BusinessRuleException('Emergency replenishment requires ShortPickReference or EvidenceRefs');
    }

    const reason = await this.ResolveReplenishmentReason(
      normalized.ReasonCode,
      ActionCode.Create,
      normalized.EvidenceRefs ?? [],
    );
    await this.AssertTargetEligibility(normalized, source);
    const now = new Date();

    let result: ReplenishmentTaskEntity;
    try {
      result = await this.audited.Run<ReplenishmentTaskEntity>(async (manager) => {
        await this.AcquireTargetReleaseLock(normalized.TargetLocationId, manager);
        const lockedSource = await this.LockAndAssertSourceAvailability(
          source,
          normalized.Quantity,
          undefined,
          manager,
          'Replenishment source QtyAvailable is insufficient after source lock',
        );
        const lockedTarget = await this.AssertTargetEligibility(normalized, lockedSource, undefined, manager);
        const taskId = randomUUID();
        const outboxId = randomUUID();
        const task = new ReplenishmentTaskEntity({
          Id: taskId,
          TaskCode: `RPL-${now.getTime()}-${taskId.slice(0, 6).toUpperCase()}`,
          TaskStatus: ReplenishmentTaskStatus.Released,
          TriggerType: normalized.TriggerType,
          SourceBalanceId: lockedSource.Balance.Id,
          SourceDimensionId: lockedSource.Dimension.Id,
          SourceLocationId: lockedSource.Location.Id,
          SourceLocationCode: lockedSource.Location.LocationCode,
          SourceInventoryStatusCode: lockedSource.Status.StatusCode,
          TargetLocationId: lockedTarget.Target.Id,
          TargetLocationCode: lockedTarget.Target.LocationCode,
          TargetLocationProfileId: lockedTarget.Target.LocationProfileId,
          WarehouseId: lockedSource.Dimension.WarehouseId,
          OwnerId: lockedSource.Dimension.OwnerId,
          SkuId: lockedSource.Dimension.SkuId,
          UomId: lockedSource.Dimension.UomId,
          Quantity: normalized.Quantity,
          ShortPickReference: normalized.ShortPickReference,
          Priority: normalized.Priority,
          WorkPoolCode: normalized.WorkPoolCode,
          AssignedUserId: normalized.AssignedUserId,
          EligibilityDecisionJson: lockedTarget.Decision,
          OutboxMessageId: outboxId,
          ReleaseIdempotencyKey: normalized.IdempotencyKey,
          ReleasePayloadFingerprint: fingerprint,
          ReasonCode: normalized.ReasonCode,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: normalized.ReasonNote,
          EvidenceRefs: normalized.EvidenceRefs,
          ReleasedAt: now,
          ReleasedBy: context.ActorUserId,
          CreatedAt: now,
          UpdatedAt: now,
          CreatedBy: context.ActorUserId,
          UpdatedBy: context.ActorUserId,
        });
        const saved = await this.replenishmentTasks.Create(task, manager);
        await this.integrations.CreateOutboxMessage(
          this.BuildReleaseOutbox(outboxId, saved, lockedSource, lockedTarget),
          manager,
        );
        return {
          result: saved,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.ReplenishmentTask,
            ObjectId: saved.Id,
            ObjectCode: saved.TaskCode,
            AfterJson: ReplenishmentTaskDtoMapper.ToDto(saved) as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'ReplenishmentRelease',
            ReferenceId: saved.Id,
            WarehouseId: saved.WarehouseId,
            OwnerId: saved.OwnerId,
            ScopeJson: this.Scope(saved),
            Result: AuditResult.Success,
          }),
        };
      });
    } catch (error) {
      const duplicate = await this.TryBuildReleaseDuplicateAfterConflict(
        error,
        normalized.IdempotencyKey,
        fingerprint,
        context,
      );
      if (duplicate) return duplicate;
      throw error;
    }

    return {
      ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(result),
      OutboxMessageId: result.OutboxMessageId,
      EventType: 'ReplenishmentTaskReleased',
      IsDuplicate: false,
    };
  }

  public async List(
    query: ListReplenishmentTasksDto,
    context?: AuditContext,
  ): Promise<ListReplenishmentTasksResultDto> {
    const warehouseId = query.WarehouseId?.trim() || undefined;
    const ownerId = query.OwnerId?.trim() || undefined;
    if (!warehouseId && !ownerId) {
      throw new BusinessRuleException('WarehouseId or OwnerId filter is required for replenishment listing');
    }
    if (context) {
      await this.AssertPermission(context, ActionCode.Read, ObjectType.ReplenishmentTask, {
        WarehouseId: warehouseId,
        OwnerId: ownerId ?? null,
      });
    }
    const page = Math.max(1, Number(query.Page ?? 1));
    const pageSize = Number(query.PageSize ?? DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(pageSize) || pageSize < 1) throw new BusinessRuleException('PageSize must be positive');
    if (pageSize > MAX_PAGE_SIZE) throw new BusinessRuleException('PageSize must not be greater than 100');
    const result = await this.replenishmentTasks.List((page - 1) * pageSize, pageSize, {
      WarehouseId: warehouseId,
      OwnerId: ownerId,
      TaskStatus: query.TaskStatus,
      TriggerType: query.TriggerType,
    });
    return {
      Items: result.Items.map(ReplenishmentTaskDtoMapper.ToDto),
      Page: page,
      PageSize: pageSize,
      TotalItems: result.TotalItems,
      TotalPages: Math.max(1, Math.ceil(result.TotalItems / pageSize)),
    };
  }

  public async Get(id: string, context?: AuditContext): Promise<ReplenishmentMutationResultDto> {
    const task = await this.LoadTask(id);
    if (context) await this.AssertPermission(context, ActionCode.Read, ObjectType.ReplenishmentTask, task);
    return { ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(task), InventoryControl: null, IsDuplicate: false };
  }

  public async Confirm(
    request: ConfirmReplenishmentTaskDto,
    context: AuditContext,
  ): Promise<ReplenishmentMutationResultDto> {
    const normalized = this.NormalizeReasoned(request);
    const task = await this.LoadTask(normalized.TaskId);
    await this.AssertPermission(context, ActionCode.Update, ObjectType.ReplenishmentTask, task);
    const fingerprint = this.Fingerprint('ConfirmReplenishmentTask', normalized);
    if (task.ConfirmIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(task.ConfirmPayloadFingerprint, fingerprint);
      return { ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(task), InventoryControl: null, IsDuplicate: true };
    }
    this.AssertTaskStatus(task, [ReplenishmentTaskStatus.Released]);

    const result = await this.audited.Run<{
      Task: ReplenishmentTaskEntity;
      Control: InventoryControlResultDto | null;
      IsDuplicate: boolean;
    }>(async (manager) => {
      const current = await this.replenishmentTasks.FindByIdForUpdate(task.Id, manager);
      if (!current) throw new NotFoundException('Replenishment task not found', { TaskId: task.Id });
      if (current.ConfirmIdempotencyKey === normalized.IdempotencyKey) {
        this.AssertSameFingerprint(current.ConfirmPayloadFingerprint, fingerprint);
        return {
          result: { Task: current, Control: null, IsDuplicate: true },
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.ReplenishmentTask,
            ObjectId: current.Id,
            ObjectCode: current.TaskCode,
            ReferenceType: 'ReplenishmentConfirmDuplicate',
            ReferenceId: current.Id,
            WarehouseId: current.WarehouseId,
            OwnerId: current.OwnerId,
            ScopeJson: this.Scope(current),
            Result: AuditResult.Success,
          }),
        };
      }
      this.AssertTaskStatus(current, [ReplenishmentTaskStatus.Released]);
      await this.AssertReleasedTaskStillAvailable(current, manager);
      const control = await this.inventoryControl.MoveInternalInTransaction(
        {
          SourceBalanceId: current.SourceBalanceId,
          TargetLocationId: current.TargetLocationId,
          Quantity: current.Quantity,
          ReasonCode: normalized.ReasonCode,
          ReasonNote: normalized.ReasonNote,
          EvidenceRefs: normalized.EvidenceRefs,
          IdempotencyKey: normalized.IdempotencyKey,
        },
        context,
        manager,
      );
      const now = new Date();
      const updated = await this.replenishmentTasks.Update(
        new ReplenishmentTaskEntity({
          ...current,
          TaskStatus: ReplenishmentTaskStatus.Confirmed,
          ConfirmTransactionId: control.result.InventoryTransaction.Id,
          ConfirmMovementId: control.result.InventoryMovement.Id,
          ConfirmOutboxMessageId: control.result.OutboxMessageId,
          ConfirmIdempotencyKey: normalized.IdempotencyKey,
          ConfirmPayloadFingerprint: fingerprint,
          ReasonCode: normalized.ReasonCode,
          ReasonCodeId: control.result.InventoryTransaction.ReasonCodeId,
          ReasonNote: normalized.ReasonNote,
          EvidenceRefs: normalized.EvidenceRefs,
          ConfirmedAt: now,
          ConfirmedBy: context.ActorUserId,
          UpdatedAt: now,
          UpdatedBy: context.ActorUserId,
        }),
        manager,
      );
      return {
        result: { Task: updated, Control: control.result, IsDuplicate: false },
        entry: [
          control.entry,
          MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.ReplenishmentTask,
            ObjectId: updated.Id,
            ObjectCode: updated.TaskCode,
            BeforeJson: ReplenishmentTaskDtoMapper.ToDto(current) as unknown as Record<string, unknown>,
            AfterJson: ReplenishmentTaskDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
            ReasonCodeId: control.result.InventoryTransaction.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'ReplenishmentConfirm',
            ReferenceId: control.result.InventoryTransaction.Id,
            WarehouseId: updated.WarehouseId,
            OwnerId: updated.OwnerId,
            ScopeJson: this.Scope(updated),
            Result: AuditResult.Success,
          }),
        ],
      };
    });

    return {
      ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(result.Task),
      InventoryControl: result.Control,
      IsDuplicate: result.IsDuplicate,
    };
  }

  public async Cancel(
    request: CancelReplenishmentTaskDto,
    context: AuditContext,
  ): Promise<ReplenishmentMutationResultDto> {
    const normalized = this.NormalizeReasoned(request);
    const task = await this.LoadTask(normalized.TaskId);
    await this.AssertPermission(context, ActionCode.DeleteCancel, ObjectType.ReplenishmentTask, task);
    const fingerprint = this.Fingerprint('CancelReplenishmentTask', normalized);
    if (task.CancelIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(task.CancelPayloadFingerprint, fingerprint);
      return {
        ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(task),
        EventType: 'ReplenishmentTaskCancelled',
        IsDuplicate: true,
      };
    }
    this.AssertTaskStatus(task, [ReplenishmentTaskStatus.Released]);
    const reason = await this.ResolveReplenishmentReason(
      normalized.ReasonCode,
      ActionCode.DeleteCancel,
      normalized.EvidenceRefs ?? [],
    );
    const now = new Date();
    const saved = await this.audited.Run(async (manager) => {
      const current = await this.replenishmentTasks.FindByIdForUpdate(task.Id, manager);
      if (!current) throw new NotFoundException('Replenishment task not found', { TaskId: task.Id });
      if (current.CancelIdempotencyKey === normalized.IdempotencyKey) {
        this.AssertSameFingerprint(current.CancelPayloadFingerprint, fingerprint);
        return {
          result: current,
          entry: MergeAuditContext(context, {
            Action: ActionCode.DeleteCancel,
            ObjectType: ObjectType.ReplenishmentTask,
            ObjectId: current.Id,
            ObjectCode: current.TaskCode,
            ReferenceType: 'ReplenishmentCancelDuplicate',
            ReferenceId: current.Id,
            WarehouseId: current.WarehouseId,
            OwnerId: current.OwnerId,
            ScopeJson: this.Scope(current),
            Result: AuditResult.Success,
          }),
        };
      }
      this.AssertTaskStatus(current, [ReplenishmentTaskStatus.Released]);
      const updated = await this.replenishmentTasks.Update(
        new ReplenishmentTaskEntity({
          ...current,
          TaskStatus: ReplenishmentTaskStatus.Cancelled,
          CancelIdempotencyKey: normalized.IdempotencyKey,
          CancelPayloadFingerprint: fingerprint,
          ReasonCode: normalized.ReasonCode,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: normalized.ReasonNote,
          EvidenceRefs: normalized.EvidenceRefs,
          CancelledAt: now,
          CancelledBy: context.ActorUserId,
          UpdatedAt: now,
          UpdatedBy: context.ActorUserId,
        }),
        manager,
      );
      return {
        result: updated,
        entry: MergeAuditContext(context, {
          Action: ActionCode.DeleteCancel,
          ObjectType: ObjectType.ReplenishmentTask,
          ObjectId: updated.Id,
          ObjectCode: updated.TaskCode,
          BeforeJson: ReplenishmentTaskDtoMapper.ToDto(current) as unknown as Record<string, unknown>,
          AfterJson: ReplenishmentTaskDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
          EvidenceRefs: normalized.EvidenceRefs,
          ReferenceType: 'ReplenishmentCancel',
          ReferenceId: updated.Id,
          WarehouseId: updated.WarehouseId,
          OwnerId: updated.OwnerId,
          ScopeJson: this.Scope(updated),
          Result: AuditResult.Success,
        }),
      };
    });

    return {
      ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(saved),
      EventType: 'ReplenishmentTaskCancelled',
      IsDuplicate: false,
    };
  }

  public async RecordReconciliationFailure(
    request: RecordInventoryReconciliationFailureDto,
    context: AuditContext,
  ): Promise<InventoryReconciliationFailureResultDto> {
    const normalized = this.NormalizeReconciliationFailure(request);
    await this.AssertPermission(context, ActionCode.Update, ObjectType.ReconciliationRun, {
      WarehouseId: normalized.WarehouseId,
      OwnerId: normalized.OwnerId ?? null,
    });
    const reason = await this.ResolveReconciliationReason(normalized.ReasonCode ?? '', normalized.EvidenceRefs ?? []);
    const fingerprint = this.Fingerprint('RecordInventoryReconciliationFailure', normalized);
    const messageId = this.BuildReconciliationMessageId(normalized);
    const referenceId = this.BuildReconciliationReferenceId(normalized);
    const existing = await this.integrations.FindOutboxMessageByMessageId(messageId);
    if (existing) {
      this.AssertSameFingerprint((existing.Payload?.Fingerprint as string | undefined) ?? null, fingerprint);
      const cases = await this.exceptionCases.List(0, 1, {
        ReferenceType: RECONCILIATION_REFERENCE_TYPE,
        ReferenceId: referenceId,
      });
      return {
        BusinessReference: normalized.BusinessReference,
        EventType: existing.EventType,
        ErrorMessage: normalized.ErrorMessage,
        RetryStatus: normalized.RetryStatus,
        WarehouseId: normalized.WarehouseId,
        OwnerId: normalized.OwnerId ?? null,
        OutboxMessageId: existing.Id,
        ExceptionCaseId: cases.Items[0]?.Id ?? null,
        IsDuplicate: true,
      };
    }

    let result: { Outbox: OutboxMessageEntity; Exception: ExceptionCaseEntity };
    try {
      result = await this.audited.Run(async (manager) => {
        const now = new Date();
        const outboxId = randomUUID();
        const exceptionId = randomUUID();
        const outbox = new OutboxMessageEntity({
          Id: outboxId,
          MessageId: messageId,
          EventType: normalized.EventType,
          Version: '1.0',
          BusinessReference: normalized.BusinessReference,
          SourceSystem: 'LTA-WMS',
          TargetSystem: 'INTEGRATION',
          WarehouseContext: normalized.WarehouseId,
          OwnerContext: normalized.OwnerId ?? null,
          EventTime: now,
          CorrelationId: context.CorrelationId,
          CausationId: normalized.BusinessReference,
          Payload: {
            BusinessReference: normalized.BusinessReference,
            EventType: normalized.EventType,
            ErrorMessage: normalized.ErrorMessage,
            RetryStatus: normalized.RetryStatus,
            WarehouseId: normalized.WarehouseId,
            OwnerId: normalized.OwnerId ?? null,
            Payload: normalized.Payload ?? null,
            EvidenceRefs: normalized.EvidenceRefs,
            Fingerprint: fingerprint,
          },
          Status: OutboxMessageStatus.Pending,
          CreatedAt: now,
          CreatedBy: context.ActorUserId,
        });
        const exception = new ExceptionCaseEntity({
          Id: exceptionId,
          ExceptionType: RECONCILIATION_EXCEPTION_TYPE,
          State: ExceptionState.Detected,
          ReferenceType: RECONCILIATION_REFERENCE_TYPE,
          ReferenceId: referenceId,
          WarehouseId: normalized.WarehouseId,
          OwnerId: normalized.OwnerId ?? null,
          ReasonCodeId: reason.ReasonCodeId,
          Severity: ControlExceptionSeverity.High,
          EvidenceRefs: normalized.EvidenceRefs,
          ResolutionNote: normalized.ErrorMessage,
          OpenedAt: now,
          CreatedAt: now,
          UpdatedAt: now,
          CreatedBy: context.ActorUserId,
          UpdatedBy: context.ActorUserId,
        });
        const savedOutbox = await this.integrations.CreateOutboxMessage(outbox, manager);
        const savedException = await this.exceptionCases.Create(exception, manager);
        return {
          result: { Outbox: savedOutbox, Exception: savedException },
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.ReconciliationRun,
            ObjectId: savedException.Id,
            ObjectCode: normalized.BusinessReference,
            AfterJson: {
              BusinessReference: normalized.BusinessReference,
              EventType: normalized.EventType,
              ErrorMessage: normalized.ErrorMessage,
              RetryStatus: normalized.RetryStatus,
              ExceptionCaseId: savedException.Id,
              OutboxMessageId: savedOutbox.Id,
            },
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ErrorMessage,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: RECONCILIATION_REFERENCE_TYPE,
            ReferenceId: referenceId,
            WarehouseId: normalized.WarehouseId,
            OwnerId: normalized.OwnerId ?? null,
            ScopeJson: { WarehouseId: normalized.WarehouseId, OwnerId: normalized.OwnerId ?? null },
            Result: AuditResult.Success,
          }),
        };
      });
    } catch (error) {
      const duplicate = await this.TryBuildReconciliationDuplicateAfterConflict(
        error,
        normalized,
        fingerprint,
        messageId,
        referenceId,
      );
      if (duplicate) return duplicate;
      throw error;
    }

    return {
      BusinessReference: normalized.BusinessReference,
      EventType: normalized.EventType,
      ErrorMessage: normalized.ErrorMessage,
      RetryStatus: normalized.RetryStatus,
      WarehouseId: normalized.WarehouseId,
      OwnerId: normalized.OwnerId ?? null,
      OutboxMessageId: result.Outbox.Id,
      ExceptionCaseId: result.Exception.Id,
      IsDuplicate: false,
    };
  }

  private async LoadTask(id: string): Promise<ReplenishmentTaskEntity> {
    const task = await this.replenishmentTasks.FindById(id?.trim() ?? '');
    if (!task) throw new NotFoundException('Replenishment task not found', { TaskId: id });
    return task;
  }

  private async LoadSource(sourceBalanceId: string): Promise<BalanceContext> {
    if (!sourceBalanceId) throw new BusinessRuleException('SourceBalanceId is required');
    const balance = await this.inventoryBalances.FindById(sourceBalanceId);
    if (!balance) throw new NotFoundException('Inventory balance not found', { SourceBalanceId: sourceBalanceId });
    const dimension = await this.inventoryDimensions.FindById(balance.DimensionId);
    if (!dimension) throw new NotFoundException('Inventory dimension not found', { DimensionId: balance.DimensionId });
    const status = await this.inventoryStatuses.FindById(dimension.InventoryStatusId);
    if (!status) {
      throw new BusinessRuleException('InventoryStatus foundation record is missing', {
        InventoryStatusId: dimension.InventoryStatusId,
      });
    }
    const location = await this.locations.FindById(dimension.LocationId);
    if (!location) throw new BusinessRuleException('Source location not found', { LocationId: dimension.LocationId });
    return { Balance: balance, Dimension: dimension, Status: status, Location: location };
  }

  private BuildReleaseDuplicateResult(existing: ReplenishmentTaskEntity): ReplenishmentMutationResultDto {
    return {
      ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(existing),
      OutboxMessageId: existing.OutboxMessageId,
      EventType: 'ReplenishmentTaskReleased',
      IsDuplicate: true,
    };
  }

  private async TryBuildReleaseDuplicateAfterConflict(
    error: unknown,
    idempotencyKey: string,
    fingerprint: string,
    context: AuditContext,
  ): Promise<ReplenishmentMutationResultDto | null> {
    void error;
    const existing = await this.replenishmentTasks.FindByReleaseIdempotencyKey(idempotencyKey);
    if (!existing) return null;
    await this.AssertPermission(context, ActionCode.Create, ObjectType.ReplenishmentTask, existing);
    this.AssertSameFingerprint(existing.ReleasePayloadFingerprint, fingerprint);
    return this.BuildReleaseDuplicateResult(existing);
  }

  private async TryBuildReconciliationDuplicateAfterConflict(
    error: unknown,
    request: RecordInventoryReconciliationFailureDto,
    fingerprint: string,
    messageId: string,
    referenceId: string,
  ): Promise<InventoryReconciliationFailureResultDto | null> {
    void error;
    const existing = await this.integrations.FindOutboxMessageByMessageId(messageId);
    if (!existing) return null;
    this.AssertSameFingerprint((existing.Payload?.Fingerprint as string | undefined) ?? null, fingerprint);
    const cases = await this.exceptionCases.List(0, 1, {
      ReferenceType: RECONCILIATION_REFERENCE_TYPE,
      ReferenceId: referenceId,
    });
    return {
      BusinessReference: request.BusinessReference,
      EventType: existing.EventType,
      ErrorMessage: request.ErrorMessage,
      RetryStatus: request.RetryStatus,
      WarehouseId: request.WarehouseId,
      OwnerId: request.OwnerId ?? null,
      OutboxMessageId: existing.Id,
      ExceptionCaseId: cases.Items[0]?.Id ?? null,
      IsDuplicate: true,
    };
  }

  private async AcquireTargetReleaseLock(targetLocationId: string, manager: EntityManager): Promise<void> {
    if (!manager) return;
    const query = (manager as { query?: (sql: string, parameters?: unknown[]) => Promise<unknown> }).query;
    if (!query) return;
    await query.call(manager, 'SELECT pg_advisory_xact_lock(hashtext($1))', [
      `replenishment-target:${targetLocationId}`,
    ]);
  }

  private async AssertTargetEligibility(
    request: ReleaseReplenishmentTaskDto,
    source: BalanceContext,
    excludeTaskId?: string,
    manager?: EntityManager,
  ): Promise<TargetEligibility> {
    const target = await this.locations.FindById(request.TargetLocationId);
    if (!target)
      throw new NotFoundException('Target pick face location not found', {
        TargetLocationId: request.TargetLocationId,
      });
    if (target.WarehouseId !== source.Dimension.WarehouseId) {
      throw new BusinessRuleException('Replenishment target must be in the same warehouse as source', {
        SourceWarehouseId: source.Dimension.WarehouseId,
        TargetWarehouseId: target.WarehouseId,
      });
    }
    if (target.Id === source.Dimension.LocationId) {
      throw new BusinessRuleException('Replenishment target must be different from source location', {
        SourceLocationId: source.Dimension.LocationId,
        TargetLocationId: target.Id,
      });
    }
    if (target.LocationStatus !== LocationStatus.Active) {
      throw new BusinessRuleException('Replenishment target location must be active', {
        TargetLocationId: target.Id,
        LocationStatus: target.LocationStatus,
      });
    }
    if (target.OwnerRestriction && target.OwnerRestriction !== source.Dimension.OwnerId) {
      throw new BusinessRuleException('Replenishment target owner restriction does not allow source owner', {
        TargetLocationId: target.Id,
        OwnerRestriction: target.OwnerRestriction,
        OwnerId: source.Dimension.OwnerId,
      });
    }

    const profile = target.LocationProfileId ? await this.locationProfiles.FindById(target.LocationProfileId) : null;
    if (profile && profile.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Replenishment target location profile must be active', {
        TargetLocationProfileId: profile.Id,
        Status: profile.Status,
      });
    }
    if (!this.IsPickFace(target, profile)) {
      throw new BusinessRuleException('Replenishment target must be a pick face location', {
        TargetLocationId: target.Id,
        LocationType: target.LocationType,
      });
    }
    if (this.PolicyBlocks(profile?.EligibilityPolicy) || this.PolicyBlocks(profile?.OperationPolicy)) {
      throw new BusinessRuleException('Replenishment target location profile blocks replenishment', {
        TargetLocationProfileId: profile?.Id ?? null,
      });
    }
    await this.AssertTargetMixPolicy(target, profile, source.Dimension);

    const currentQuantity = await this.SumTargetQuantity(target.Id, source.Dimension);
    const currentLocationQuantity = await this.SumTargetQuantity(target.Id);
    const openTargetQuantity = await this.replenishmentTasks.SumOpenTargetQuantity(
      {
        TargetLocationId: target.Id,
        ExcludeTaskId: excludeTaskId,
      },
      manager,
    );
    const openSameSkuQuantity = await this.replenishmentTasks.SumOpenTargetQuantity(
      {
        TargetLocationId: target.Id,
        OwnerId: source.Dimension.OwnerId,
        SkuId: source.Dimension.SkuId,
        UomId: source.Dimension.UomId,
        ExcludeTaskId: excludeTaskId,
      },
      manager,
    );
    const projectedLocationQuantity = currentLocationQuantity + openTargetQuantity + request.Quantity;
    const projectedSameSkuQuantity = currentQuantity + openSameSkuQuantity + request.Quantity;
    if (target.CapacityQty !== null && projectedLocationQuantity > target.CapacityQty) {
      throw new BusinessRuleException('Replenishment target capacity would be exceeded', {
        TargetLocationId: target.Id,
        CapacityQty: target.CapacityQty,
        CurrentQuantity: currentLocationQuantity,
        OpenReplenishmentQuantity: openTargetQuantity,
        Quantity: request.Quantity,
      });
    }

    const coverage = await this.itemCoverages.FindBySkuWarehouseOwner(
      source.Dimension.SkuId,
      source.Dimension.WarehouseId,
      source.Dimension.OwnerId,
    );
    if (request.TriggerType === ReplenishmentTriggerType.MinMax) {
      if (!coverage || coverage.Status !== MasterDataStatus.Active || coverage.MinQty === null) {
        throw new BusinessRuleException('MinMax replenishment requires active ItemCoverage.MinQty', {
          SkuId: source.Dimension.SkuId,
          WarehouseId: source.Dimension.WarehouseId,
          OwnerId: source.Dimension.OwnerId,
        });
      }
      if (currentQuantity + openSameSkuQuantity >= coverage.MinQty) {
        throw new BusinessRuleException('Pick face quantity is not below ItemCoverage.MinQty', {
          CurrentQuantity: currentQuantity,
          OpenReplenishmentQuantity: openSameSkuQuantity,
          MinQty: coverage.MinQty,
        });
      }
    }
    if (coverage?.MaxQty !== null && coverage?.MaxQty !== undefined && projectedSameSkuQuantity > coverage.MaxQty) {
      throw new BusinessRuleException('Replenishment target would exceed ItemCoverage.MaxQty', {
        CurrentQuantity: currentQuantity,
        OpenReplenishmentQuantity: openSameSkuQuantity,
        Quantity: request.Quantity,
        MaxQty: coverage.MaxQty,
      });
    }

    return {
      Target: target,
      Profile: profile,
      CurrentQuantity: currentQuantity,
      Coverage: coverage,
      Decision: {
        Rule: 'PickSequenceOrPickFacePolicy',
        CurrentQuantity: currentQuantity,
        CurrentLocationQuantity: currentLocationQuantity,
        OpenReplenishmentQuantity: openTargetQuantity,
        OpenSameSkuReplenishmentQuantity: openSameSkuQuantity,
        CapacityQty: target.CapacityQty,
        CoverageMinQty: coverage?.MinQty ?? null,
        CoverageMaxQty: coverage?.MaxQty ?? null,
        ProfileCode: profile?.ProfileCode ?? null,
      },
    };
  }

  private async SumTargetQuantity(
    targetLocationId: string,
    sourceDimension?: InventoryDimensionEntity,
  ): Promise<number> {
    let skip = 0;
    let total = 0;
    for (;;) {
      const result = await this.inventoryDimensions.List(skip, 1000, {
        OwnerId: sourceDimension?.OwnerId,
        SkuId: sourceDimension?.SkuId,
        WarehouseId: sourceDimension?.WarehouseId,
        LocationId: targetLocationId,
        UomId: sourceDimension?.UomId,
      });
      for (const dimension of result.Items) {
        const balance = await this.inventoryBalances.FindByDimensionId(dimension.Id);
        if (balance) total += balance.QtyOnHand;
      }
      if (result.Items.length === 0 || skip + result.Items.length >= result.TotalItems) break;
      skip += result.Items.length;
    }
    return total;
  }

  private async AssertTargetMixPolicy(
    target: LocationEntity,
    profile: LocationProfileEntity | null,
    sourceDimension: InventoryDimensionEntity,
  ): Promise<void> {
    const mixSkuPolicy = this.ResolveMixPolicy(target.MixSkuPolicy, profile, ['MixSkuPolicy', 'mixSkuPolicy']);
    const mixOwnerPolicy = this.ResolveMixPolicy(target.MixOwnerPolicy, profile, ['MixOwnerPolicy', 'mixOwnerPolicy']);
    const mixLotPolicy = this.ResolveMixPolicy(target.MixLotPolicy, profile, ['MixLotPolicy', 'mixLotPolicy']);
    const blockSkuMix = this.IsNoMixPolicy(mixSkuPolicy);
    const blockOwnerMix = this.IsNoMixPolicy(mixOwnerPolicy);
    const blockLotMix = this.IsNoMixPolicy(mixLotPolicy);
    if (!blockSkuMix && !blockOwnerMix && !blockLotMix) return;

    let skip = 0;
    for (;;) {
      const result = await this.inventoryDimensions.List(skip, 1000, {
        WarehouseId: sourceDimension.WarehouseId,
        LocationId: target.Id,
      });
      for (const dimension of result.Items) {
        const balance = await this.inventoryBalances.FindByDimensionId(dimension.Id);
        if (!balance || balance.QtyOnHand <= 0) continue;
        if (blockSkuMix && dimension.SkuId !== sourceDimension.SkuId) {
          throw new BusinessRuleException('Replenishment target NoMix SKU policy blocks mixed SKU', {
            TargetLocationId: target.Id,
            ExistingSkuId: dimension.SkuId,
            SourceSkuId: sourceDimension.SkuId,
          });
        }
        if (blockOwnerMix && dimension.OwnerId !== sourceDimension.OwnerId) {
          throw new BusinessRuleException('Replenishment target NoMix owner policy blocks mixed owner', {
            TargetLocationId: target.Id,
            ExistingOwnerId: dimension.OwnerId,
            SourceOwnerId: sourceDimension.OwnerId,
          });
        }
        if (blockLotMix && (dimension.LotNumber ?? null) !== (sourceDimension.LotNumber ?? null)) {
          throw new BusinessRuleException('Replenishment target NoMix lot policy blocks mixed lot', {
            TargetLocationId: target.Id,
            ExistingLotNumber: dimension.LotNumber ?? null,
            SourceLotNumber: sourceDimension.LotNumber ?? null,
          });
        }
      }
      if (result.Items.length === 0 || skip + result.Items.length >= result.TotalItems) break;
      skip += result.Items.length;
    }
  }

  private async LockAndAssertSourceAvailability(
    source: BalanceContext,
    quantity: number,
    excludeTaskId: string | undefined,
    manager: EntityManager,
    message: string,
  ): Promise<BalanceContext> {
    const lockedBalance = await this.inventoryBalances.FindByDimensionIdForUpdate(source.Dimension.Id, manager);
    if (!lockedBalance || lockedBalance.Id !== source.Balance.Id) {
      throw new ConflictException('Replenishment source balance changed before inventory lock');
    }
    const lockedSource = { ...source, Balance: lockedBalance };
    if (lockedSource.Status.StatusCode !== 'AVAILABLE') {
      throw new BusinessRuleException('Replenishment source balance must remain AVAILABLE', {
        SourceBalanceId: lockedSource.Balance.Id,
        SourceInventoryStatusCode: lockedSource.Status.StatusCode,
      });
    }
    const openSourceQuantity = await this.replenishmentTasks.SumOpenSourceQuantity(
      lockedSource.Balance.Id,
      excludeTaskId,
      manager,
    );
    if (lockedSource.Balance.QtyAvailable - openSourceQuantity < quantity) {
      throw new BusinessRuleException(message, {
        SourceBalanceId: lockedSource.Balance.Id,
        QtyAvailable: lockedSource.Balance.QtyAvailable,
        OpenReplenishmentQuantity: openSourceQuantity,
        Quantity: quantity,
      });
    }
    return lockedSource;
  }

  private async AssertReleasedTaskStillAvailable(task: ReplenishmentTaskEntity, manager: EntityManager): Promise<void> {
    const source = await this.LoadSource(task.SourceBalanceId);
    const lockedSource = await this.LockAndAssertSourceAvailability(
      source,
      task.Quantity,
      task.Id,
      manager,
      'Replenishment source QtyAvailable is insufficient before confirm',
    );
    await this.AssertTargetEligibility(
      {
        TriggerType: task.TriggerType,
        SourceBalanceId: task.SourceBalanceId,
        TargetLocationId: task.TargetLocationId,
        Quantity: task.Quantity,
        ShortPickReference: task.ShortPickReference,
        Priority: task.Priority,
        WorkPoolCode: task.WorkPoolCode,
        AssignedUserId: task.AssignedUserId,
        ReasonCode: task.ReasonCode ?? 'RC-V1-REPLENISHMENT',
        ReasonNote: task.ReasonNote,
        EvidenceRefs: task.EvidenceRefs,
        IdempotencyKey: task.ReleaseIdempotencyKey,
      },
      lockedSource,
      task.Id,
      manager,
    );
  }

  private IsPickFace(location: LocationEntity, profile: LocationProfileEntity | null): boolean {
    if (location.PickSequence !== null) return true;
    const locationType = location.LocationType.toLowerCase();
    if (locationType.includes('pick') && locationType.includes('face')) return true;
    return (
      this.PolicyFlag(profile?.EligibilityPolicy, ['pickFace', 'isPickFace', 'replenishmentTarget']) ||
      this.PolicyFlag(profile?.OperationPolicy, ['pickFace', 'isPickFace', 'replenishmentAllowed'])
    );
  }

  private PolicyBlocks(policy?: Record<string, unknown> | null): boolean {
    return (
      this.PolicyFlag(policy, [
        'replenishmentBlocked',
        'pickFaceBlocked',
        'pickBlocked',
        'blockReplenishment',
        'replenishmentDisabled',
      ]) || this.PolicyExplicitFalse(policy, ['replenishmentAllowed', 'allowReplenishment', 'canReplenish'])
    );
  }

  private PolicyFlag(policy: Record<string, unknown> | null | undefined, keys: string[]): boolean {
    if (!policy) return false;
    return keys.some((key) => policy[key] === true);
  }

  private PolicyExplicitFalse(policy: Record<string, unknown> | null | undefined, keys: string[]): boolean {
    if (!policy) return false;
    return keys.some((key) => policy[key] === false || String(policy[key]).toLowerCase() === 'false');
  }

  private ResolveMixPolicy(
    locationPolicy: string | null,
    profile: LocationProfileEntity | null,
    profileKeys: string[],
  ): string | null {
    if (locationPolicy) return locationPolicy;
    if (!profile) return null;
    for (const key of profileKeys) {
      const value = profile.MixPolicy[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private IsNoMixPolicy(policy: string | null): boolean {
    if (!policy) return false;
    return ['nomix', 'no_mix', 'single', 'singleonly'].includes(policy.trim().toLowerCase().replace(/[\s-]/g, ''));
  }

  private BuildReleaseOutbox(
    outboxId: string,
    task: ReplenishmentTaskEntity,
    source: BalanceContext,
    target: TargetEligibility,
  ): OutboxMessageEntity {
    const idempotencyDigest = createHash('sha256').update(task.ReleaseIdempotencyKey).digest('hex').slice(0, 24);
    return new OutboxMessageEntity({
      Id: outboxId,
      MessageId: `ReplenishmentTaskReleased:${task.SourceBalanceId}:${idempotencyDigest}`,
      EventType: 'ReplenishmentTaskReleased',
      Version: '1.0',
      BusinessReference: task.TaskCode,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: task.WarehouseCode ?? task.WarehouseId,
      OwnerContext: task.OwnerCode ?? task.OwnerId,
      EventTime: task.ReleasedAt ?? new Date(),
      CorrelationId: task.Id,
      CausationId: task.SourceBalanceId,
      Payload: {
        EventType: 'ReplenishmentTaskReleased',
        ReplenishmentTask: ReplenishmentTaskDtoMapper.ToDto(task),
        SourceBalance: {
          BalanceId: source.Balance.Id,
          DimensionId: source.Balance.DimensionId,
          QtyOnHand: source.Balance.QtyOnHand,
          QtyReserved: source.Balance.QtyReserved,
          QtyAvailable: source.Balance.QtyAvailable,
        },
        TargetLocation: {
          LocationId: target.Target.Id,
          LocationCode: target.Target.LocationCode,
          CurrentQuantity: target.CurrentQuantity,
        },
        ReasonCode: task.ReasonCode,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: task.CreatedBy,
    });
  }

  private async AssertPermission(
    context: AuditContext,
    action: ActionCode,
    objectType: ObjectType,
    scope: { WarehouseId?: string | null; OwnerId?: string | null },
  ): Promise<void> {
    if (!context.ActorUserId) throw new ForbiddenAppException('Authenticated actor is required');
    if (!this.permissionChecker) return;
    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
      Action: action,
      ObjectType: objectType,
      Scope: { WarehouseId: scope.WarehouseId, OwnerId: scope.OwnerId },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException('Permission denied for replenishment/reconciliation action', {
        Action: action,
        ObjectType: objectType,
        Reason: decision.Reason ?? 'PERMISSION_DENIED',
      });
    }
  }

  private async ResolveReplenishmentReason(
    reasonCode: string,
    action: ActionCode,
    evidenceRefs: string[],
  ): Promise<ReasonDecision> {
    if (!reasonCode) throw new BusinessRuleException('ReasonCode is required for replenishment task');
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: action,
      ObjectType: ObjectType.ReplenishmentTask,
    });
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for this replenishment reason', {
        ReasonCode: reasonCode,
      });
    }
    if (reason.ApprovalRequired) {
      throw new BusinessRuleException('Approval-required reason is not directly supported by V1-17 replenishment', {
        ReasonCode: reasonCode,
      });
    }
    return { ReasonCode: reasonCode, ReasonCodeId: reason.ReasonCodeId };
  }

  private async ResolveReconciliationReason(reasonCode: string, evidenceRefs: string[]): Promise<ReasonDecision> {
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.ReconciliationRun,
    });
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for reconciliation failure reason', {
        ReasonCode: reasonCode,
      });
    }
    if (reason.ApprovalRequired) {
      throw new BusinessRuleException('Approval-required reason is deferred to V1-29 reconciliation workspace', {
        ReasonCode: reasonCode,
      });
    }
    return { ReasonCode: reasonCode, ReasonCodeId: reason.ReasonCodeId };
  }

  private NormalizeRelease(request: ReleaseReplenishmentTaskDto): ReleaseReplenishmentTaskDto {
    const normalized: ReleaseReplenishmentTaskDto = {
      TriggerType: request.TriggerType,
      SourceBalanceId: request.SourceBalanceId?.trim() ?? '',
      TargetLocationId: request.TargetLocationId?.trim() ?? '',
      Quantity: Number(request.Quantity),
      ShortPickReference: request.ShortPickReference?.trim() || null,
      Priority: request.Priority === null || request.Priority === undefined ? null : Number(request.Priority),
      WorkPoolCode: request.WorkPoolCode?.trim() || null,
      AssignedUserId: request.AssignedUserId?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() ?? '',
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!Object.values(ReplenishmentTriggerType).includes(normalized.TriggerType)) {
      throw new BusinessRuleException('TriggerType is invalid');
    }
    if (!normalized.SourceBalanceId) throw new BusinessRuleException('SourceBalanceId is required');
    if (!normalized.TargetLocationId) throw new BusinessRuleException('TargetLocationId is required');
    this.AssertQuantity(normalized.Quantity, 'Quantity');
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized;
  }

  private NormalizeReasoned<T extends ConfirmReplenishmentTaskDto | CancelReplenishmentTaskDto>(request: T): T {
    const normalized = {
      ...request,
      TaskId: request.TaskId?.trim() ?? '',
      ReasonCode: request.ReasonCode?.trim().toUpperCase() ?? '',
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.TaskId) throw new BusinessRuleException('TaskId is required');
    if (!normalized.ReasonCode) throw new BusinessRuleException('ReasonCode is required');
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized as T;
  }

  private NormalizeReconciliationFailure(
    request: RecordInventoryReconciliationFailureDto,
  ): RecordInventoryReconciliationFailureDto {
    const normalized: RecordInventoryReconciliationFailureDto = {
      BusinessReference: request.BusinessReference?.trim() ?? '',
      EventType: request.EventType?.trim() || 'InventoryReconciliationFailed',
      WarehouseId: request.WarehouseId?.trim() ?? '',
      OwnerId: request.OwnerId?.trim() || null,
      ErrorMessage: request.ErrorMessage?.trim() ?? '',
      RetryStatus: request.RetryStatus,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
      Payload: request.Payload ?? null,
    };
    if (!normalized.BusinessReference) throw new BusinessRuleException('BusinessReference is required');
    if (normalized.EventType !== 'InventoryReconciliationFailed') {
      throw new BusinessRuleException('Only InventoryReconciliationFailed event is supported by this hook');
    }
    if (!normalized.WarehouseId) throw new BusinessRuleException('WarehouseId is required');
    if (!normalized.ErrorMessage) throw new BusinessRuleException('ErrorMessage is required');
    if (!['PendingRetry', 'Retrying', 'DeadLetter'].includes(normalized.RetryStatus)) {
      throw new BusinessRuleException('Unsupported reconciliation failure retry status');
    }
    if (!normalized.ReasonCode) throw new BusinessRuleException('ReasonCode is required for reconciliation failure');
    if ((normalized.EvidenceRefs ?? []).length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for reconciliation failure');
    }
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized;
  }

  private NormalizeEvidence(evidenceRefs?: string[]): string[] {
    return (evidenceRefs ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private AssertQuantity(value: number, field: string): void {
    if (!Number.isFinite(value) || value <= 0) throw new BusinessRuleException(`${field} must be greater than zero`);
  }

  private AssertIdempotency(idempotencyKey: string): void {
    if (!idempotencyKey) throw new BusinessRuleException('IdempotencyKey is required');
  }

  private AssertTaskStatus(task: ReplenishmentTaskEntity, allowed: ReplenishmentTaskStatus[]): void {
    if (!allowed.includes(task.TaskStatus)) {
      throw new BusinessRuleException('Replenishment task status does not allow this operation', {
        TaskId: task.Id,
        TaskStatus: task.TaskStatus,
        Allowed: allowed,
      });
    }
  }

  private AssertSameFingerprint(existing: string | null | undefined, expected: string): void {
    if (existing !== expected) {
      throw new ConflictException('Replenishment idempotency key already used for a different payload');
    }
  }

  private BuildReconciliationMessageId(request: RecordInventoryReconciliationFailureDto): string {
    const digest = createHash('sha256')
      .update(
        [
          request.EventType,
          request.WarehouseId,
          request.OwnerId ?? '',
          request.BusinessReference,
          request.IdempotencyKey,
        ].join(':'),
      )
      .digest('hex')
      .slice(0, 24);
    return `RECONCILIATION:${digest}`;
  }

  private BuildReconciliationReferenceId(request: RecordInventoryReconciliationFailureDto): string {
    return createHash('sha256')
      .update(`${request.WarehouseId}:${request.OwnerId ?? ''}:${request.BusinessReference}:${request.IdempotencyKey}`)
      .digest('hex')
      .slice(0, 48);
  }

  private Fingerprint(operation: string, payload: unknown): string {
    return createHash('sha256')
      .update(this.StableStringify({ Operation: operation, Payload: payload }))
      .digest('hex');
  }

  private StableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((item) => this.StableStringify(item)).join(',')}]`;
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.StableStringify(record[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }

  private Scope(scope: { WarehouseId?: string | null; OwnerId?: string | null }): Record<string, unknown> {
    return { WarehouseId: scope.WarehouseId ?? null, OwnerId: scope.OwnerId ?? null };
  }
}
