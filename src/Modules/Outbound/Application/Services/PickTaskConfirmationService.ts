import { createHash, randomUUID } from 'crypto';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { EntityManager } from 'typeorm';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import {
  ConfirmPickTaskDto,
  ConfirmPickTaskResultDto,
  PickTaskScanEvidenceDto,
} from '@modules/Outbound/Application/DTOs/PickTaskConfirmDto';
import { IOutboundOrderRepository } from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { IPickReleaseRepository } from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PickReleaseDtoMapper } from '@modules/Outbound/Application/Mappers/PickReleaseDtoMapper';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileTaskDtoMapper } from '@modules/TaskExecution/Application/Mappers/MobileTaskDtoMapper';
import { AssertMobileTaskPermission } from '@modules/TaskExecution/Application/UseCases/MobileTaskPermission';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

const PICKED_STATUS = 'PICKED';
const DEFAULT_REASON_CODE = 'RC-V1-DISCREPANCY';
const ALLOWED_MOBILE_CONFIRM_STATUSES = new Set<MobileTaskStatus>([
  MobileTaskStatus.Claimed,
  MobileTaskStatus.InProgress,
]);
interface NormalizedConfirmPickTaskDto extends ConfirmPickTaskDto {
  MobileTaskId: string | null;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  DeviceCode: string | null;
  SessionId: string | null;
  IdempotencyKey: string;
}

class PickConfirmDuplicateResult extends Error {
  constructor(public readonly Result: ConfirmPickTaskResultDto) {
    super('Pick confirm duplicate result');
  }
}

export class PickTaskConfirmationService {
  constructor(
    private readonly pickReleases: IPickReleaseRepository,
    private readonly outboundOrders: IOutboundOrderRepository,
    private readonly taskExecution: ITaskExecutionRepository,
    private readonly inventoryControl: InventoryControlUseCase,
    private readonly integrations: IIntegrationRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Confirm(
    pickTaskId: string,
    request: ConfirmPickTaskDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ConfirmPickTaskResultDto> {
    const normalized = this.NormalizeRequest(request);
    if (!pickTaskId?.trim()) throw new BusinessRuleException('PickTaskId is required');
    if (!context.ActorUserId) throw new ForbiddenAppException('Authenticated actor is required');

    const pickTask = await this.LoadPickTask(pickTaskId);
    const mobileTask = await this.LoadMobileTask(pickTask, normalized.MobileTaskId);
    await this.AssertPermissions(context.ActorUserId, pickTask, mobileTask);

    const fingerprint = this.BuildConfirmPayloadFingerprint(pickTask, mobileTask, normalized);
    if (pickTask.Status === PickTaskStatus.Completed) {
      try {
        await this.AssertDuplicateReplayAllowed(pickTask, mobileTask, context.ActorUserId);
      } catch (error) {
        await this.AuditRejectedConfirm(context, pickTask, mobileTask, error);
        throw error;
      }
      return this.BuildCompletedDuplicateResult(pickTask, mobileTask, normalized, fingerprint);
    }

    try {
      await this.AssertConfirmable(pickTask, mobileTask, context.ActorUserId);
    } catch (error) {
      await this.AuditRejectedConfirm(context, pickTask, mobileTask, error);
      throw error;
    }
    const scanEvidence = this.ValidateScanEvidence(
      pickTask,
      mobileTask,
      await this.taskExecution.FindScanEventsByTaskId(mobileTask.Id),
      context.ActorUserId,
    );
    const failures = scanEvidence.filter((scan) => scan.Result !== 'Accepted');
    if (failures.length > 0) {
      await this.AuditBlocked(context, pickTask, mobileTask, 'Pick scan confirmation failed', {
        ScanEvidence: scanEvidence,
      });
      throw new BusinessRuleException('Pick scan confirmation failed', { ScanEvidence: scanEvidence });
    }

    try {
      return await this.PostConfirmation(pickTask, mobileTask, normalized, context, scanEvidence, fingerprint);
    } catch (error) {
      if (error instanceof PickConfirmDuplicateResult) return error.Result;
      await this.AuditRejectedConfirm(context, pickTask, mobileTask, error);
      throw error;
    }
  }

  public async ConfirmByMobileTask(
    mobileTaskId: string,
    request: ConfirmPickTaskDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ConfirmPickTaskResultDto> {
    if (!mobileTaskId?.trim()) throw new BusinessRuleException('MobileTaskId is required');
    const mobileTask = await this.taskExecution.FindById(mobileTaskId);
    if (!mobileTask) throw new NotFoundException('Mobile pick task not found', { MobileTaskId: mobileTaskId });
    if (mobileTask.TaskType !== MobileTaskType.Pick || mobileTask.SourceDocumentType !== 'PickTask') {
      throw new ConflictException('Mobile task is not a pick execution task', {
        MobileTaskId: mobileTask.Id,
        TaskType: mobileTask.TaskType,
        SourceDocumentType: mobileTask.SourceDocumentType,
      });
    }
    return this.Confirm(
      mobileTask.SourceDocumentId,
      {
        ...request,
        MobileTaskId: request.MobileTaskId ?? mobileTask.Id,
      },
      context,
    );
  }

  private NormalizeRequest(request: ConfirmPickTaskDto): NormalizedConfirmPickTaskDto {
    const normalized = {
      MobileTaskId: request.MobileTaskId?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: (request.EvidenceRefs ?? []).map((item) => item.trim()).filter(Boolean),
      DeviceCode: request.DeviceCode?.trim() || null,
      SessionId: request.SessionId?.trim() || null,
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.IdempotencyKey) {
      throw new BusinessRuleException('IdempotencyKey is required for pick confirmation');
    }
    return normalized;
  }

  private async LoadPickTask(pickTaskId: string): Promise<PickTaskEntity> {
    const task = await this.pickReleases.FindTaskById(pickTaskId);
    if (!task) throw new NotFoundException('Pick task not found', { Id: pickTaskId });
    return task;
  }

  private async LoadMobileTask(task: PickTaskEntity, requestedMobileTaskId: string | null): Promise<MobileTaskEntity> {
    const mobileTask = await this.taskExecution.FindBySourceDocument('PickTask', task.Id);
    if (!mobileTask) throw new NotFoundException('Mobile pick task not found', { PickTaskId: task.Id });
    if (requestedMobileTaskId && mobileTask.Id !== requestedMobileTaskId) {
      throw new ConflictException('MobileTaskId does not match pick task source document', {
        MobileTaskId: requestedMobileTaskId,
        ExpectedMobileTaskId: mobileTask.Id,
      });
    }
    if (mobileTask.TaskType !== MobileTaskType.Pick || mobileTask.SourceDocumentId !== task.Id) {
      throw new ConflictException('Mobile task is not a pick execution task', {
        MobileTaskId: mobileTask.Id,
        TaskType: mobileTask.TaskType,
        SourceDocumentType: mobileTask.SourceDocumentType,
      });
    }
    return mobileTask;
  }

  private async AssertPermissions(
    actorUserId: string,
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity,
  ): Promise<void> {
    await this.AssertPickTaskPermission(actorUserId, ActionCode.Update, pickTask, mobileTask);
    await AssertMobileTaskPermission(this.permissionChecker, actorUserId, ActionCode.Update, mobileTask);
  }

  private async AssertPickTaskPermission(
    actorUserId: string,
    action: ActionCode,
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity,
  ): Promise<void> {
    if (!this.permissionChecker) return;
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: action,
      ObjectType: ObjectType.PickTask,
      Scope: { WarehouseId: mobileTask.WarehouseId, OwnerId: mobileTask.OwnerId },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException('Permission denied for pick task action', {
        Action: action,
        ObjectType: ObjectType.PickTask,
        PickTaskId: task.Id,
        Reason: decision.Reason ?? 'PERMISSION_DENIED',
      });
    }
  }

  private BuildCompletedDuplicateResult(
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    request: NormalizedConfirmPickTaskDto,
    expectedFingerprint: string,
  ): ConfirmPickTaskResultDto {
    if (
      pickTask.ConfirmIdempotencyKey !== request.IdempotencyKey ||
      pickTask.ConfirmPayloadFingerprint !== expectedFingerprint
    ) {
      throw new ConflictException('Pick confirm idempotency key or payload does not match completed task', {
        PickTaskId: pickTask.Id,
        ConfirmIdempotencyKey: pickTask.ConfirmIdempotencyKey,
      });
    }
    if (pickTask.ConfirmResultJson) {
      return {
        ...(pickTask.ConfirmResultJson as unknown as ConfirmPickTaskResultDto),
        IsDuplicate: true,
      };
    }
    return this.BuildResult(pickTask, mobileTask, null, [], true);
  }

  private async AssertDuplicateReplayAllowed(
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    actorUserId: string,
  ): Promise<void> {
    if (pickTask.CompletedBy === actorUserId || mobileTask.AssignedUserId === actorUserId) return;
    throw new ForbiddenAppException('Only the original claimant can replay this pick confirmation', {
      PickTaskId: pickTask.Id,
      CompletedBy: pickTask.CompletedBy,
      MobileTaskId: mobileTask.Id,
      AssignedUserId: mobileTask.AssignedUserId,
    });
  }

  private async AssertConfirmable(
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    actorUserId: string,
  ): Promise<void> {
    if (pickTask.Status !== PickTaskStatus.Released) {
      throw new BusinessRuleException('Pick task status cannot be confirmed', {
        PickTaskStatus: pickTask.Status,
      });
    }
    if (!ALLOWED_MOBILE_CONFIRM_STATUSES.has(mobileTask.TaskStatus)) {
      throw new BusinessRuleException('Mobile pick task must be claimed before confirm', {
        MobileTaskStatus: mobileTask.TaskStatus,
      });
    }
    if (mobileTask.AssignedUserId !== actorUserId) {
      throw new ForbiddenAppException('Only the current claimant can confirm this pick task', {
        MobileTaskId: mobileTask.Id,
        AssignedUserId: mobileTask.AssignedUserId,
      });
    }
    // IFB-14: task.SerialNumber is a single scalar -- one value cannot identify N>1 physical
    // units. A task allocated against a specific serial but carrying Quantity!=1 means the
    // allocation/receiving data upstream is already inconsistent; fail loud here rather than let
    // ValidateScanEvidence silently confirm a scan that can't represent per-unit identity.
    if (pickTask.SerialNumber !== null && pickTask.Quantity !== 1) {
      throw new BusinessRuleException('SerialControlled pick task requires Quantity = 1 when a SerialNumber is set', {
        PickTaskId: pickTask.Id,
        SerialNumber: pickTask.SerialNumber,
        Quantity: pickTask.Quantity,
      });
    }
  }

  private ValidateScanEvidence(
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    scanEvents: MobileScanEventEntity[],
    actorUserId: string,
  ): PickTaskScanEvidenceDto[] {
    const actorScans = scanEvents
      .filter((scan) => scan.ActorUserId === actorUserId)
      .sort((left, right) => left.CreatedAt.getTime() - right.CreatedAt.getTime() || left.Id.localeCompare(right.Id));
    const latestByType = (scanType: MobileScanType) =>
      [...actorScans].reverse().find((scan) => scan.ScanType === scanType) ?? null;
    const itemScan = latestByType(MobileScanType.Item);
    const quantityScan = latestByType(MobileScanType.Quantity);
    const locationScan = latestByType(MobileScanType.Location);
    const lotScan = latestByType(MobileScanType.Lot);
    const serialScan = latestByType(MobileScanType.Serial);
    const expiryScan = latestByType(MobileScanType.ExpiryDate);
    const parsed = itemScan?.ParsedValueJson ?? {};
    const quantityValue = quantityScan
      ? Number(quantityScan.NormalizedValue ?? quantityScan.RawValue)
      : parsed.Quantity;
    const quantityEvidenceScan = quantityScan ?? (typeof parsed.Quantity === 'number' ? itemScan : null);
    return [
      this.CompareScan(
        'Location',
        locationScan,
        task.SourceLocationId,
        locationScan?.ResolvedObjectId ?? locationScan?.NormalizedValue ?? null,
      ),
      this.CompareScan('Item', itemScan, task.SkuId, itemScan?.ResolvedObjectId ?? null),
      this.CompareScan(
        'Quantity',
        quantityEvidenceScan,
        task.Quantity,
        typeof quantityValue === 'number' ? quantityValue : null,
      ),
      this.CompareOptionalScan(
        'Lot',
        lotScan ?? itemScan,
        task.LotNumber,
        lotScan ? this.StringValue(lotScan.NormalizedValue ?? lotScan.RawValue) : this.StringValue(parsed.Lot),
      ),
      this.CompareOptionalScan(
        'Serial',
        serialScan ?? itemScan,
        task.SerialNumber,
        serialScan
          ? this.StringValue(serialScan.NormalizedValue ?? serialScan.RawValue)
          : this.StringValue(parsed.Serial),
      ),
      this.CompareOptionalScan(
        'ExpiryDate',
        expiryScan ?? itemScan,
        task.ExpiryDate ? task.ExpiryDate.toISOString().slice(0, 10) : null,
        expiryScan
          ? this.StringValue(expiryScan.NormalizedValue ?? expiryScan.RawValue)
          : this.StringValue(parsed.ExpiryDate),
      ),
    ].filter(
      (scan) =>
        !(
          scan.ExpectedValue === null &&
          scan.ScanType !== 'Location' &&
          scan.ScanType !== 'Item' &&
          scan.ScanType !== 'Quantity'
        ),
    );
  }

  private CompareScan(
    scanType: PickTaskScanEvidenceDto['ScanType'],
    scan: MobileScanEventEntity | null,
    expected: string | number | null,
    actual: string | number | null,
  ): PickTaskScanEvidenceDto {
    if (!scan) {
      return {
        ScanType: scanType,
        ScanEventId: null,
        RawValue: null,
        ExpectedValue: expected,
        ActualValue: null,
        Result: 'Missing',
      };
    }
    if (scan.Result !== MobileScanResult.Accepted) {
      return {
        ScanType: scanType,
        ScanEventId: scan.Id,
        RawValue: scan.RawValue,
        ExpectedValue: expected,
        ActualValue: actual,
        Result: 'Rejected',
        RejectionCode: scan.RejectionCode ?? `REJECTED_${scanType.toUpperCase()}`,
      };
    }
    const matched =
      typeof expected === 'number'
        ? typeof actual === 'number' && Math.abs(actual - expected) < 0.000001
        : this.Normalize(actual) === this.Normalize(expected);
    return {
      ScanType: scanType,
      ScanEventId: scan.Id,
      RawValue: scan.RawValue,
      ExpectedValue: expected,
      ActualValue: actual,
      Result: matched ? 'Accepted' : 'Rejected',
      RejectionCode: matched ? null : `WRONG_${scanType.toUpperCase()}`,
    };
  }

  private CompareOptionalScan(
    scanType: PickTaskScanEvidenceDto['ScanType'],
    scan: MobileScanEventEntity | null,
    expected: string | null,
    actual: string | null,
  ): PickTaskScanEvidenceDto {
    if (!expected) {
      return {
        ScanType: scanType,
        ScanEventId: scan?.Id ?? null,
        RawValue: scan?.RawValue ?? null,
        ExpectedValue: null,
        ActualValue: actual,
        Result: 'Accepted',
      };
    }
    return this.CompareScan(scanType, scan, expected, actual);
  }

  private StringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private Normalize(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toUpperCase();
  }

  private async PostConfirmation(
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    request: NormalizedConfirmPickTaskDto,
    context: AuditContext,
    scanEvidence: PickTaskScanEvidenceDto[],
    fingerprint: string,
  ): Promise<ConfirmPickTaskResultDto> {
    const now = new Date();
    return await this.audited.Run(async (manager) => {
      const lockedPickTask = await this.pickReleases.FindTaskByIdForUpdate(pickTask.Id, manager);
      if (!lockedPickTask) throw new NotFoundException('Pick task not found', { Id: pickTask.Id });
      const lockedMobileTask = await this.taskExecution.FindByIdForUpdate(mobileTask.Id, manager);
      if (!lockedMobileTask) throw new NotFoundException('Mobile pick task not found', { Id: mobileTask.Id });
      if (lockedPickTask.Status === PickTaskStatus.Completed) {
        await this.AssertDuplicateReplayAllowed(lockedPickTask, lockedMobileTask, context.ActorUserId as string);
        throw new PickConfirmDuplicateResult(
          this.BuildCompletedDuplicateResult(lockedPickTask, lockedMobileTask, request, fingerprint),
        );
      }
      await this.AssertConfirmable(lockedPickTask, lockedMobileTask, context.ActorUserId as string);
      const scanEvidenceAfterLock = this.ValidateScanEvidence(
        lockedPickTask,
        lockedMobileTask,
        await this.taskExecution.FindScanEventsByTaskId(lockedMobileTask.Id, manager),
        context.ActorUserId as string,
      );
      const failures = scanEvidenceAfterLock.filter((scan) => scan.Result !== 'Accepted');
      if (failures.length > 0) {
        throw new BusinessRuleException('Pick scan confirmation failed', { ScanEvidence: scanEvidenceAfterLock });
      }
      const evidenceRefs = this.BuildEvidenceRefs(request.EvidenceRefs, scanEvidenceAfterLock);
      const inventory = await this.inventoryControl.ChangeStatusInTransaction(
        {
          SourceBalanceId: lockedPickTask.SourceBalanceId,
          TargetInventoryStatusCode: PICKED_STATUS,
          Quantity: lockedPickTask.Quantity,
          ReasonCode: request.ReasonCode,
          ReasonNote: request.ReasonNote,
          EvidenceRefs: evidenceRefs,
          IdempotencyKey: request.IdempotencyKey,
        },
        context,
        manager,
      );
      const outboxId = randomUUID();
      lockedPickTask.Status = PickTaskStatus.Completed;
      lockedPickTask.CompletedAt = now;
      lockedPickTask.CompletedBy = context.ActorUserId;
      lockedPickTask.ConfirmIdempotencyKey = request.IdempotencyKey;
      lockedPickTask.ConfirmPayloadFingerprint = fingerprint;
      lockedPickTask.ConfirmOutboxMessageId = outboxId;
      lockedPickTask.ConfirmInventoryTransactionId = inventory.result.InventoryTransaction.Id;
      const savedPickTask = await this.pickReleases.SaveTask(lockedPickTask, manager);
      lockedMobileTask.Complete(context.ActorUserId, now);
      const savedMobileTask = await this.taskExecution.Save(lockedMobileTask, manager);
      await this.integrations.CreateOutboxMessage(
        this.BuildOutbox(
          outboxId,
          savedPickTask,
          savedMobileTask,
          inventory.result,
          scanEvidenceAfterLock,
          context.ActorUserId,
        ),
        manager,
      );
      await this.RecordCoreFlowMilestone(savedPickTask, context.ActorUserId, manager);
      const result = this.BuildResult(savedPickTask, savedMobileTask, inventory.result, scanEvidenceAfterLock, false);
      savedPickTask.ConfirmResultJson = result as unknown as Record<string, unknown>;
      await this.pickReleases.SaveTask(savedPickTask, manager);
      return {
        result,
        entry: [
          inventory.entry,
          this.BuildPickTaskAudit(context, savedPickTask, {
            BeforeJson: this.PickTaskToAuditJson(pickTask),
            AfterJson: result as unknown as Record<string, unknown>,
            ReasonNote: request.ReasonNote ?? request.ReasonCode,
            EvidenceRefs: evidenceRefs,
          }),
          this.BuildMobileTaskAudit(context, savedMobileTask, {
            BeforeJson: MobileTaskDtoMapper.ToDto(mobileTask) as unknown as Record<string, unknown>,
            AfterJson: MobileTaskDtoMapper.ToDto(savedMobileTask) as unknown as Record<string, unknown>,
            ReasonNote: request.ReasonNote ?? request.ReasonCode,
          }),
        ],
      };
    });
  }

  private BuildEvidenceRefs(requestEvidenceRefs: string[], scanEvidence: PickTaskScanEvidenceDto[]): string[] {
    return [
      ...requestEvidenceRefs,
      ...scanEvidence
        .filter((scan) => scan.Result === 'Accepted' && scan.ScanEventId)
        .map((scan) => `mobile-scan:${scan.ScanEventId}`),
    ];
  }

  private BuildResult(
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity | null,
    inventoryControl: ConfirmPickTaskResultDto['InventoryControl'],
    scanEvidence: PickTaskScanEvidenceDto[],
    isDuplicate: boolean,
  ): ConfirmPickTaskResultDto {
    return {
      PickTask: PickReleaseDtoMapper.ToTaskDto(pickTask),
      MobileTask: mobileTask ? MobileTaskDtoMapper.ToDto(mobileTask) : null,
      InventoryControl: inventoryControl,
      ScanEvidence: scanEvidence,
      OutboxMessageId: pickTask.ConfirmOutboxMessageId,
      IsDuplicate: isDuplicate,
    };
  }

  private BuildOutbox(
    outboxId: string,
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    inventoryControl: ConfirmPickTaskResultDto['InventoryControl'],
    scanEvidence: PickTaskScanEvidenceDto[],
    actorUserId: string | null,
  ): OutboxMessageEntity {
    const idempotencyDigest = createHash('sha256')
      .update(pickTask.ConfirmIdempotencyKey ?? pickTask.Id)
      .digest('hex')
      .slice(0, 24);
    return new OutboxMessageEntity({
      Id: outboxId,
      MessageId: `PickTaskConfirmed:${pickTask.Id}:${idempotencyDigest}`,
      EventType: 'PickTaskConfirmed',
      Version: '1.0',
      BusinessReference: pickTask.TaskNumber,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: mobileTask.WarehouseCode ?? mobileTask.WarehouseId,
      OwnerContext: mobileTask.OwnerCode ?? mobileTask.OwnerId,
      EventTime: pickTask.CompletedAt ?? new Date(),
      CorrelationId: inventoryControl?.InventoryTransaction.Id ?? pickTask.OutboundOrderId,
      CausationId: pickTask.Id,
      Payload: {
        PickTask: this.PickTaskToAuditJson(pickTask),
        MobileTask: MobileTaskDtoMapper.ToDto(mobileTask),
        InventoryControl: inventoryControl,
        ScanEvidence: scanEvidence,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: actorUserId,
    });
  }

  private async RecordCoreFlowMilestone(
    pickTask: PickTaskEntity,
    actorUserId: string | null,
    manager: EntityManager,
  ): Promise<void> {
    const order = await this.outboundOrders.FindById(pickTask.OutboundOrderId);
    const coreFlowInstanceId = order?.Order.CoreFlowInstanceId;
    if (!coreFlowInstanceId) return;
    await this.coreFlows.CreateMilestone(
      new WorkflowMilestoneEntity({
        Id: randomUUID(),
        CoreFlowInstanceId: coreFlowInstanceId,
        StageCode: CoreFlowStageCode.Outbound,
        StepCode: CoreFlowStepCode.PickConfirmed,
        MilestoneStatus: WorkflowMilestoneStatus.Completed,
        Metadata: {
          PickTaskId: pickTask.Id,
          PickReleaseId: pickTask.PickReleaseId,
          OutboundOrderId: pickTask.OutboundOrderId,
          Quantity: pickTask.Quantity,
          InventoryStatusCode: PICKED_STATUS,
        },
        OccurredAt: pickTask.CompletedAt ?? new Date(),
        CreatedBy: actorUserId,
      }),
      manager,
    );
  }

  private BuildPickTaskAudit(
    context: AuditContext,
    task: PickTaskEntity,
    input: {
      BeforeJson?: Record<string, unknown> | null;
      AfterJson?: Record<string, unknown> | null;
      Result?: AuditResult;
      ReasonNote?: string | null;
      EvidenceRefs?: string[];
    },
  ): AuditEntry {
    return MergeAuditContext(context, {
      Action: ActionCode.Update,
      ObjectType: ObjectType.PickTask,
      ObjectId: task.Id,
      ObjectCode: task.TaskNumber,
      BeforeJson: input.BeforeJson ?? null,
      AfterJson: input.AfterJson ?? null,
      ReasonNote: input.ReasonNote ?? null,
      EvidenceRefs: input.EvidenceRefs?.length ? input.EvidenceRefs : null,
      WarehouseId: null,
      OwnerId: null,
      Result: input.Result ?? AuditResult.Success,
    });
  }

  private BuildMobileTaskAudit(
    context: AuditContext,
    task: MobileTaskEntity,
    input: {
      BeforeJson?: Record<string, unknown> | null;
      AfterJson?: Record<string, unknown> | null;
      Result?: AuditResult;
      ReasonNote?: string | null;
    },
  ): AuditEntry {
    return MergeAuditContext(context, {
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
      ObjectId: task.Id,
      ObjectCode: task.TaskCode,
      BeforeJson: input.BeforeJson ?? null,
      AfterJson: input.AfterJson ?? null,
      ReasonNote: input.ReasonNote ?? null,
      WarehouseId: task.WarehouseId,
      OwnerId: task.OwnerId,
      ScopeJson: { WarehouseId: task.WarehouseId, OwnerId: task.OwnerId },
      Result: input.Result ?? AuditResult.Success,
    });
  }

  private async AuditBlocked(
    context: AuditContext,
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    reason: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.audited.Run(async () => ({
      result: undefined,
      entry: [
        this.BuildPickTaskAudit(context, task, {
          Result: AuditResult.Failed,
          BeforeJson: this.PickTaskToAuditJson(task),
          AfterJson: { Decision: 'Blocked', Reason: reason, ...details },
        }),
        this.BuildMobileTaskAudit(context, mobileTask, {
          Result: AuditResult.Failed,
          BeforeJson: MobileTaskDtoMapper.ToDto(mobileTask) as unknown as Record<string, unknown>,
          AfterJson: { Decision: 'Blocked', Reason: reason, ...details },
        }),
      ],
    }));
  }

  private async AuditRejectedConfirm(
    context: AuditContext,
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    error: unknown,
  ): Promise<void> {
    if (!(error instanceof BusinessRuleException) && !(error instanceof ForbiddenAppException)) return;
    await this.AuditBlocked(context, task, mobileTask, error.message, {
      Details: error.Details ?? {},
    });
  }

  private PickTaskToAuditJson(task: PickTaskEntity): Record<string, unknown> {
    return {
      Id: task.Id,
      TaskNumber: task.TaskNumber,
      Status: task.Status,
      PickReleaseId: task.PickReleaseId,
      OutboundOrderId: task.OutboundOrderId,
      AllocationId: task.AllocationId,
      AllocationLineId: task.AllocationLineId,
      SourceBalanceId: task.SourceBalanceId,
      SourceDimensionId: task.SourceDimensionId,
      SourceLocationId: task.SourceLocationId,
      SkuId: task.SkuId,
      Quantity: task.Quantity,
      InventoryStatusCode: task.InventoryStatusCode,
      LotNumber: task.LotNumber,
      SerialNumber: task.SerialNumber,
      ExpiryDate: task.ExpiryDate?.toISOString().slice(0, 10) ?? null,
      CompletedAt: task.CompletedAt?.toISOString() ?? null,
      CompletedBy: task.CompletedBy,
      ConfirmIdempotencyKey: task.ConfirmIdempotencyKey,
      ConfirmOutboxMessageId: task.ConfirmOutboxMessageId,
      ConfirmInventoryTransactionId: task.ConfirmInventoryTransactionId,
    };
  }

  private BuildConfirmPayloadFingerprint(
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity,
    request: NormalizedConfirmPickTaskDto,
  ): string {
    return this.Hash({
      PickTaskId: task.Id,
      MobileTaskId: mobileTask.Id,
      ReasonCode: request.ReasonCode,
      ReasonNote: request.ReasonNote,
      EvidenceRefs: request.EvidenceRefs,
      DeviceCode: request.DeviceCode,
      SessionId: request.SessionId,
    });
  }

  private Hash(payload: unknown): string {
    return createHash('sha256').update(this.StableStringify(payload)).digest('hex');
  }

  private StableStringify(value: unknown): string {
    if (value instanceof Date) return JSON.stringify(value.toISOString());
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
}
