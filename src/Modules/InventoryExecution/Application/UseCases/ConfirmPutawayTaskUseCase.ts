import { createHash, randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { EntityManager } from 'typeorm';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  ConfirmPutawayTaskDto,
  ConfirmPutawayTaskResultDto,
  PutawayConfirmScanDto,
} from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { InventoryTransactionDtoMapper } from '@modules/InventoryExecution/Application/Mappers/InventoryTransactionDtoMapper';
import { PutawayTaskDtoMapper } from '@modules/InventoryExecution/Application/Mappers/PutawayTaskDtoMapper';
import {
  BuildPutawayTaskAudit,
  PutawayTaskToAuditJson,
} from '@modules/InventoryExecution/Application/UseCases/PutawayTaskAudit';
import {
  AssertInventoryMovementPermission,
  AssertPutawayTaskPermission,
} from '@modules/InventoryExecution/Application/UseCases/PutawayTaskPermission';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { InventoryMovementStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryMovementStatus';
import { InventoryTransactionStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionStatus';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';

const READY_FOR_PUTAWAY = 'READY_FOR_PUTAWAY';
const AVAILABLE = 'AVAILABLE';
const ALLOWED_CONFIRM_STATUSES = new Set<PutawayTaskStatus>([PutawayTaskStatus.Released, PutawayTaskStatus.InProgress]);

interface DimensionPlan {
  SourceHash: string;
  TargetHash: string;
  ReadyStatus: InventoryStatusEntity;
  AvailableStatus: InventoryStatusEntity;
}

interface BalanceMutationResult {
  SourceBalance: InventoryBalanceEntity;
  TargetBalance: InventoryBalanceEntity;
  SourceDimension: InventoryDimensionEntity;
  TargetDimension: InventoryDimensionEntity;
}

class PutawayConfirmDuplicateResult extends Error {
  constructor(public readonly Result: ConfirmPutawayTaskResultDto) {
    super('Putaway confirm duplicate result');
  }
}

export class ConfirmPutawayTaskUseCase {
  constructor(
    private readonly putawayTasks: IPutawayTaskRepository,
    private readonly inventoryTransactions: IInventoryTransactionRepository,
    private readonly inventoryStatuses: IInventoryStatusRepository,
    private readonly inventoryDimensions: IInventoryDimensionRepository,
    private readonly inventoryBalances: IInventoryBalanceRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly taskExecution: ITaskExecutionRepository,
    private readonly dimensionKeyService: InventoryDimensionKeyService,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    taskId: string,
    request: ConfirmPutawayTaskDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ConfirmPutawayTaskResultDto> {
    const normalizedRequest = this.NormalizeRequest(request);
    this.AssertRequest(taskId, normalizedRequest);
    const task = await this.LoadTask(taskId);
    await AssertPutawayTaskPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, task);
    await AssertInventoryMovementPermission(this.permissionChecker, context.ActorUserId, ActionCode.Create, task);

    const quantity = this.ResolveQuantity(normalizedRequest.ConfirmedQuantity, task);
    const duplicate = await this.inventoryTransactions.FindTransactionByIdempotencyKey(
      task.Id,
      normalizedRequest.IdempotencyKey,
    );
    if (duplicate) {
      return await this.BuildDuplicateResult(
        task,
        duplicate,
        this.ValidateScans(task, normalizedRequest),
        quantity,
        normalizedRequest,
      );
    }

    const scanResults = this.ValidateScans(task, normalizedRequest);
    const scanFailures = scanResults.filter((scan) => scan.Result === MobileScanResult.Rejected);
    if (scanFailures.length > 0) {
      await this.AuditBlocked(context, task, 'Putaway scan confirmation failed', { ScanResults: scanResults });
      throw new BusinessRuleException('Putaway scan confirmation failed', { ScanResults: scanResults });
    }

    if (!ALLOWED_CONFIRM_STATUSES.has(task.TaskStatus)) {
      await this.AuditBlocked(context, task, 'Putaway task status cannot be confirmed', {
        TaskStatus: task.TaskStatus,
      });
      throw new BusinessRuleException('Putaway task status cannot be confirmed', { TaskStatus: task.TaskStatus });
    }

    const reasonCode = normalizedRequest.ReasonCode?.trim() || null;
    const reasonCodeId = reasonCode
      ? (
          await this.reasonCatalog.ValidateReason({
            ReasonCode: reasonCode,
            Action: ActionCode.Create,
            ObjectType: ObjectType.InventoryMovement,
          })
        ).ReasonCodeId
      : null;
    const dimensionPlan = await this.BuildDimensionPlan(task);

    try {
      return await this.PostConfirmation(task, normalizedRequest, context, quantity, scanResults, dimensionPlan, {
        ReasonCode: reasonCode,
        ReasonCodeId: reasonCodeId,
      });
    } catch (error) {
      if (error instanceof PutawayConfirmDuplicateResult) {
        return error.Result;
      }
      if (error instanceof BusinessRuleException) {
        await this.AuditBlocked(context, task, error.message, (error.Details ?? {}) as Record<string, unknown>);
      }
      throw error;
    }
  }

  private NormalizeRequest(request: ConfirmPutawayTaskDto): ConfirmPutawayTaskDto {
    return {
      SourceLocationScan: request.SourceLocationScan?.trim() ?? '',
      TargetLocationScan: request.TargetLocationScan?.trim() ?? '',
      LpnScan: request.LpnScan?.trim() || null,
      ConfirmedQuantity: request.ConfirmedQuantity,
      ReasonCode: request.ReasonCode?.trim() || null,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: (request.EvidenceRefs ?? []).map((item) => item.trim()).filter(Boolean),
      DeviceCode: request.DeviceCode?.trim() || null,
      SessionId: request.SessionId?.trim() || null,
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
  }

  private async LoadTask(taskId: string): Promise<PutawayTaskEntity> {
    const task = await this.putawayTasks.FindById(taskId);
    if (!task) throw new NotFoundException('Putaway task not found', { Id: taskId });
    return task;
  }

  private AssertRequest(taskId: string, request: ConfirmPutawayTaskDto): void {
    if (!taskId?.trim()) throw new BusinessRuleException('Putaway task id is required');
    if (!request.IdempotencyKey?.trim()) throw new BusinessRuleException('IdempotencyKey is required');
    if (!request.SourceLocationScan?.trim()) throw new BusinessRuleException('SourceLocationScan is required');
    if (!request.TargetLocationScan?.trim()) throw new BusinessRuleException('TargetLocationScan is required');
  }

  private ResolveQuantity(value: number | null | undefined, task: PutawayTaskEntity): number {
    const quantity = value === null || value === undefined ? task.Quantity : Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BusinessRuleException('ConfirmedQuantity must be greater than zero');
    }
    if (Math.abs(quantity - task.Quantity) > 0.000001) {
      throw new BusinessRuleException('Partial putaway confirmation is not supported in V1-14', {
        ConfirmedQuantity: quantity,
        ExpectedQuantity: task.Quantity,
      });
    }
    return quantity;
  }

  private ValidateScans(task: PutawayTaskEntity, request: ConfirmPutawayTaskDto): PutawayConfirmScanDto[] {
    const scans: PutawayConfirmScanDto[] = [
      this.CompareScan('SourceLocation', request.SourceLocationScan, task.SourceLocationCode),
      this.CompareScan('TargetLocation', request.TargetLocationScan, task.TargetLocationCode),
    ];
    const expectedLpnAliases = [task.LpnCode, task.SsccCode].filter((value): value is string => !!value);
    if (expectedLpnAliases.length > 0 || request.LpnScan) {
      const matchedAlias =
        expectedLpnAliases.find((value) => this.Normalize(value) === this.Normalize(request.LpnScan)) ?? null;
      scans.push({
        ScanType: 'Lpn',
        RawValue: request.LpnScan ?? '',
        ExpectedValue: matchedAlias ?? expectedLpnAliases[0] ?? null,
        Result: matchedAlias ? MobileScanResult.Accepted : MobileScanResult.Rejected,
      });
    }
    return scans;
  }

  private CompareScan(scanType: string, rawValue: string, expectedValue: string | null): PutawayConfirmScanDto {
    return {
      ScanType: scanType,
      RawValue: rawValue,
      ExpectedValue: expectedValue,
      Result:
        expectedValue && this.Normalize(rawValue) === this.Normalize(expectedValue)
          ? MobileScanResult.Accepted
          : MobileScanResult.Rejected,
    };
  }

  private Normalize(value?: string | null): string {
    return (value ?? '').trim().toUpperCase();
  }

  private AssertDuplicateMatches(
    transaction: InventoryTransactionEntity,
    movement: InventoryMovementEntity,
    task: PutawayTaskEntity,
    quantity: number,
    request: ConfirmPutawayTaskDto,
  ): void {
    const existingFingerprint = this.ReadConfirmPayloadFingerprint(movement);
    const expectedFingerprint = this.BuildConfirmPayloadFingerprint(task, quantity, request);
    if (
      Math.abs(transaction.Quantity - quantity) > 0.000001 ||
      transaction.FromLocationCode !== task.SourceLocationCode ||
      transaction.ToLocationCode !== task.TargetLocationCode ||
      existingFingerprint !== expectedFingerprint ||
      this.Normalize(request.TargetLocationScan) !== this.Normalize(transaction.ToLocationCode) ||
      this.Normalize(request.SourceLocationScan) !== this.Normalize(transaction.FromLocationCode) ||
      (task.LpnCode || task.SsccCode
        ? ![task.LpnCode, task.SsccCode]
            .filter((value): value is string => !!value)
            .some((value) => this.Normalize(value) === this.Normalize(request.LpnScan))
        : !!request.LpnScan?.trim())
    ) {
      throw new ConflictException('Putaway confirm idempotency key already used for a different payload');
    }
  }

  private ReadConfirmPayloadFingerprint(movement: InventoryMovementEntity): string | null {
    const fingerprint = movement.ScanEvidenceJson.ConfirmPayloadFingerprint;
    return typeof fingerprint === 'string' ? fingerprint : null;
  }

  private BuildConfirmPayloadFingerprint(
    task: PutawayTaskEntity,
    quantity: number,
    request: ConfirmPutawayTaskDto,
  ): string {
    const payload = {
      ConfirmedQuantity: quantity,
      DeviceCode: request.DeviceCode ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      LpnScan: request.LpnScan ?? null,
      PutawayTaskId: task.Id,
      ReasonCode: request.ReasonCode ?? null,
      ReasonNote: request.ReasonNote ?? null,
      SessionId: request.SessionId ?? null,
      SourceLocationScan: request.SourceLocationScan,
      TargetLocationScan: request.TargetLocationScan,
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private async BuildDuplicateResult(
    task: PutawayTaskEntity,
    transaction: InventoryTransactionEntity,
    scanResults: PutawayConfirmScanDto[],
    quantity: number,
    request: ConfirmPutawayTaskDto,
  ): Promise<ConfirmPutawayTaskResultDto> {
    const movement = await this.inventoryTransactions.FindMovementByTransactionId(transaction.Id);
    if (!movement) throw new ConflictException('Putaway confirm duplicate transaction has no movement record');
    this.AssertDuplicateMatches(transaction, movement, task, quantity, request);
    const sourceBalance = await this.inventoryBalances.FindById(movement.FromBalanceId);
    const targetBalance = await this.inventoryBalances.FindById(movement.ToBalanceId);
    if (!sourceBalance || !targetBalance) {
      throw new ConflictException('Putaway confirm duplicate transaction has incomplete balance records');
    }
    return {
      PutawayTask: PutawayTaskDtoMapper.ToDto(task, true),
      InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(transaction),
      InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(movement),
      SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(sourceBalance),
      TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(targetBalance),
      ScanResults: scanResults,
      OutboxMessageId: transaction.OutboxMessageId,
      IsDuplicate: true,
    };
  }

  private async BuildDimensionPlan(task: PutawayTaskEntity): Promise<DimensionPlan> {
    if (!task.SourceLocationId) {
      throw new BusinessRuleException('Putaway task source location is required for confirmation');
    }
    const readyStatus = await this.inventoryStatuses.FindByCode(READY_FOR_PUTAWAY);
    const availableStatus = await this.inventoryStatuses.FindByCode(AVAILABLE);
    if (!readyStatus || !availableStatus) {
      throw new BusinessRuleException('Required InventoryStatus foundation codes are missing', {
        Required: [READY_FOR_PUTAWAY, AVAILABLE],
      });
    }
    const sourceInput = this.BuildDimensionInput(task, task.SourceLocationId, readyStatus.Id);
    const targetInput = this.BuildDimensionInput(task, task.TargetLocationId, availableStatus.Id);
    return {
      SourceHash: this.dimensionKeyService.BuildHash(sourceInput),
      TargetHash: this.dimensionKeyService.BuildHash(targetInput),
      ReadyStatus: readyStatus,
      AvailableStatus: availableStatus,
    };
  }

  private BuildDimensionInput(task: PutawayTaskEntity, locationId: string, inventoryStatusId: string) {
    return {
      OwnerId: task.OwnerId,
      SkuId: task.SkuId,
      WarehouseId: task.WarehouseId,
      LocationId: locationId,
      InventoryStatusId: inventoryStatusId,
      UomId: task.UomId,
      LpnCode: task.LpnCode,
      LotNumber: task.LotNumber,
      ExpiryDate: task.ExpiryDate,
      SerialNumber: task.SerialNumber,
    };
  }

  private async PostConfirmation(
    task: PutawayTaskEntity,
    request: ConfirmPutawayTaskDto,
    context: AuditContext,
    quantity: number,
    scanResults: PutawayConfirmScanDto[],
    dimensionPlan: DimensionPlan,
    reason: { ReasonCode: string | null; ReasonCodeId: string | null },
  ): Promise<ConfirmPutawayTaskResultDto> {
    const now = new Date();
    const transactionId = randomUUID();
    const movementId = randomUUID();
    const outboxId = randomUUID();

    return await this.audited.Run(async (manager) => {
      const lockedTask = await this.putawayTasks.FindByIdForUpdate(task.Id, manager);
      if (!lockedTask) throw new NotFoundException('Putaway task not found', { Id: task.Id });
      const duplicateAfterLock = await this.inventoryTransactions.FindTransactionByIdempotencyKey(
        lockedTask.Id,
        request.IdempotencyKey,
        manager,
      );
      if (duplicateAfterLock) {
        const duplicateResult = await this.BuildDuplicateResult(
          lockedTask,
          duplicateAfterLock,
          scanResults,
          quantity,
          request,
        );
        throw new PutawayConfirmDuplicateResult(duplicateResult);
      }
      if (!ALLOWED_CONFIRM_STATUSES.has(lockedTask.TaskStatus)) {
        throw new BusinessRuleException('Putaway task status cannot be confirmed', {
          TaskStatus: lockedTask.TaskStatus,
        });
      }

      const balances = await this.ApplyBalanceMovement(
        lockedTask,
        quantity,
        dimensionPlan,
        context.ActorUserId,
        manager,
      );
      const transaction = this.BuildTransaction(
        transactionId,
        movementId,
        outboxId,
        lockedTask,
        request,
        quantity,
        now,
        context.ActorUserId,
        reason,
      );
      const movement = this.BuildMovement(
        movementId,
        transactionId,
        lockedTask,
        quantity,
        balances,
        scanResults,
        request,
        now,
        context.ActorUserId,
      );
      const postedTransaction = await this.inventoryTransactions.CreateTransaction(transaction, manager);
      const postedMovement = await this.inventoryTransactions.CreateMovement(movement, manager);
      postedTransaction.InventoryMovementId = postedMovement.Id;
      const savedTransaction = await this.inventoryTransactions.SaveTransaction(postedTransaction, manager);

      lockedTask.TaskStatus = PutawayTaskStatus.Confirmed;
      lockedTask.UpdatedAt = now;
      const confirmedTask = await this.putawayTasks.Save(lockedTask, manager);
      await this.CompleteMobileTaskAndSaveScans(confirmedTask, request, scanResults, manager, now, context.ActorUserId);
      await this.integrations.CreateOutboxMessage(
        this.BuildOutbox(outboxId, confirmedTask, savedTransaction, postedMovement),
        manager,
      );

      const result: ConfirmPutawayTaskResultDto = {
        PutawayTask: PutawayTaskDtoMapper.ToDto(confirmedTask),
        InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(savedTransaction),
        InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(postedMovement),
        SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(balances.SourceBalance),
        TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(balances.TargetBalance),
        ScanResults: scanResults,
        OutboxMessageId: outboxId,
        IsDuplicate: false,
      };

      return {
        result: result,
        entry: BuildPutawayTaskAudit(context, confirmedTask, {
          Action: ActionCode.Update,
          BeforeJson: PutawayTaskToAuditJson(task),
          AfterJson: {
            PutawayTask: PutawayTaskToAuditJson(confirmedTask),
            InventoryTransaction: result.InventoryTransaction,
            InventoryMovement: result.InventoryMovement,
            SourceBalance: result.SourceBalance,
            TargetBalance: result.TargetBalance,
            ScanResults: scanResults,
            StorageMilestone: 'Stored',
          },
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: request.ReasonNote ?? request.ReasonCode ?? null,
        }),
      };
    });
  }

  private async ApplyBalanceMovement(
    task: PutawayTaskEntity,
    quantity: number,
    dimensionPlan: DimensionPlan,
    actorUserId: string | null,
    manager: EntityManager,
  ): Promise<BalanceMutationResult> {
    const sourceDimension = await this.inventoryDimensions.FindByHash(dimensionPlan.SourceHash, manager);
    if (!sourceDimension) {
      throw new BusinessRuleException('Source inventory dimension not found for putaway confirmation', {
        DimensionStatus: READY_FOR_PUTAWAY,
        LocationId: task.SourceLocationId,
      });
    }
    const sourceBalance = await this.inventoryBalances.FindByDimensionIdForUpdate(sourceDimension.Id, manager);
    if (!sourceBalance) {
      throw new BusinessRuleException('Source inventory balance not found for putaway confirmation', {
        DimensionId: sourceDimension.Id,
      });
    }
    const remainingSourceQty = sourceBalance.QtyOnHand - quantity;
    if (remainingSourceQty < 0) {
      throw new BusinessRuleException('Putaway confirmation would create negative source balance', {
        SourceBalanceId: sourceBalance.Id,
        QtyOnHand: sourceBalance.QtyOnHand,
        ConfirmedQuantity: quantity,
      });
    }
    if (remainingSourceQty < sourceBalance.QtyReserved) {
      throw new BusinessRuleException('Putaway confirmation would create negative source available balance', {
        SourceBalanceId: sourceBalance.Id,
        QtyReserved: sourceBalance.QtyReserved,
        RemainingQtyOnHand: remainingSourceQty,
        ConfirmedQuantity: quantity,
      });
    }

    const targetDimension = await this.inventoryDimensions.FindOrCreateByHashForUpdate(
      new InventoryDimensionEntity({
        Id: randomUUID(),
        OwnerId: task.OwnerId,
        SkuId: task.SkuId,
        WarehouseId: task.WarehouseId,
        LocationId: task.TargetLocationId,
        InventoryStatusId: dimensionPlan.AvailableStatus.Id,
        DimensionKeyHash: dimensionPlan.TargetHash,
        UomId: task.UomId,
        LpnCode: task.LpnCode,
        LotNumber: task.LotNumber,
        ExpiryDate: task.ExpiryDate,
        SerialNumber: task.SerialNumber,
        SourceSystem: 'LTA-WMS',
        ReferenceId: task.Id,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
        CreatedBy: actorUserId,
        UpdatedBy: actorUserId,
      }),
      manager,
    );

    const targetBalance = await this.inventoryBalances.FindOrCreateByDimensionIdForUpdate(
      new InventoryBalanceEntity({
        Id: randomUUID(),
        DimensionId: targetDimension.Id,
        QtyOnHand: 0,
        QtyReserved: 0,
        SourceSystem: 'LTA-WMS',
        ReferenceId: task.Id,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
        CreatedBy: actorUserId,
        UpdatedBy: actorUserId,
      }),
      manager,
    );
    const updatedSource = this.BuildBalance(sourceBalance, remainingSourceQty, actorUserId, task.Id);
    const savedSource = await this.inventoryBalances.Update(updatedSource, manager);
    const savedTarget = await this.inventoryBalances.Update(
      this.BuildBalance(targetBalance, targetBalance.QtyOnHand + quantity, actorUserId, task.Id),
      manager,
    );
    return {
      SourceBalance: savedSource,
      TargetBalance: savedTarget,
      SourceDimension: sourceDimension,
      TargetDimension: targetDimension,
    };
  }

  private BuildBalance(
    current: InventoryBalanceEntity,
    qtyOnHand: number,
    actorUserId: string | null,
    referenceId: string,
  ): InventoryBalanceEntity {
    return new InventoryBalanceEntity({
      Id: current.Id,
      DimensionId: current.DimensionId,
      QtyOnHand: qtyOnHand,
      QtyReserved: current.QtyReserved,
      SourceSystem: current.SourceSystem ?? 'LTA-WMS',
      ReferenceId: referenceId,
      CreatedAt: current.CreatedAt,
      UpdatedAt: new Date(),
      CreatedBy: current.CreatedBy,
      UpdatedBy: actorUserId,
    });
  }

  private BuildTransaction(
    transactionId: string,
    movementId: string,
    outboxId: string,
    task: PutawayTaskEntity,
    request: ConfirmPutawayTaskDto,
    quantity: number,
    now: Date,
    actorUserId: string | null,
    reason: { ReasonCode: string | null; ReasonCodeId: string | null },
  ): InventoryTransactionEntity {
    return new InventoryTransactionEntity({
      Id: transactionId,
      TransactionCode: `ITX-${transactionId.slice(0, 8).toUpperCase()}`,
      TransactionType: InventoryTransactionType.PutawayConfirm,
      TransactionStatus: InventoryTransactionStatus.Posted,
      PutawayTaskId: task.Id,
      PutawayTaskCode: task.TaskCode,
      InventoryMovementId: movementId,
      OwnerId: task.OwnerId,
      OwnerCode: task.OwnerCode,
      WarehouseId: task.WarehouseId,
      WarehouseCode: task.WarehouseCode,
      SkuId: task.SkuId,
      SkuCode: task.SkuCode,
      UomId: task.UomId,
      UomCode: task.UomCode,
      Quantity: quantity,
      FromInventoryStatusCode: READY_FOR_PUTAWAY,
      ToInventoryStatusCode: AVAILABLE,
      FromLocationId: task.SourceLocationId,
      FromLocationCode: task.SourceLocationCode,
      ToLocationId: task.TargetLocationId,
      ToLocationCode: task.TargetLocationCode,
      LpnCode: task.LpnCode,
      SsccCode: task.SsccCode,
      IdempotencyKey: request.IdempotencyKey,
      OutboxMessageId: outboxId,
      ReasonCode: reason.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      PostedAt: now,
      PostedBy: actorUserId,
    });
  }

  private BuildMovement(
    movementId: string,
    transactionId: string,
    task: PutawayTaskEntity,
    quantity: number,
    balances: BalanceMutationResult,
    scanResults: PutawayConfirmScanDto[],
    request: ConfirmPutawayTaskDto,
    now: Date,
    actorUserId: string | null,
  ): InventoryMovementEntity {
    return new InventoryMovementEntity({
      Id: movementId,
      MovementCode: `IMV-${movementId.slice(0, 8).toUpperCase()}`,
      MovementStatus: InventoryMovementStatus.Posted,
      InventoryTransactionId: transactionId,
      PutawayTaskId: task.Id,
      PutawayTaskCode: task.TaskCode,
      OwnerId: task.OwnerId,
      OwnerCode: task.OwnerCode,
      WarehouseId: task.WarehouseId,
      WarehouseCode: task.WarehouseCode,
      SkuId: task.SkuId,
      SkuCode: task.SkuCode,
      UomId: task.UomId,
      UomCode: task.UomCode,
      Quantity: quantity,
      FromDimensionId: balances.SourceDimension.Id,
      FromBalanceId: balances.SourceBalance.Id,
      FromLocationId: task.SourceLocationId,
      FromLocationCode: task.SourceLocationCode,
      FromInventoryStatusCode: READY_FOR_PUTAWAY,
      ToDimensionId: balances.TargetDimension.Id,
      ToBalanceId: balances.TargetBalance.Id,
      ToLocationId: task.TargetLocationId,
      ToLocationCode: task.TargetLocationCode,
      ToInventoryStatusCode: AVAILABLE,
      LpnCode: task.LpnCode,
      SsccCode: task.SsccCode,
      ScanEvidenceJson: {
        ScanResults: scanResults,
        StorageMilestone: 'Stored',
        ConfirmPayloadFingerprint: this.BuildConfirmPayloadFingerprint(task, quantity, request),
      },
      CreatedAt: now,
      CreatedBy: actorUserId,
    });
  }

  private async CompleteMobileTaskAndSaveScans(
    task: PutawayTaskEntity,
    request: ConfirmPutawayTaskDto,
    scanResults: PutawayConfirmScanDto[],
    manager: EntityManager,
    now: Date,
    actorUserId: string | null,
  ): Promise<void> {
    if (!task.MobileTaskId) return;
    const mobileTask = await this.taskExecution.FindByIdForUpdate(task.MobileTaskId, manager);
    if (mobileTask) {
      mobileTask.TaskStatus = MobileTaskStatus.Completed;
      mobileTask.UpdatedAt = now;
      mobileTask.UpdatedBy = actorUserId;
      await this.taskExecution.Save(mobileTask, manager);
    }
    for (const scan of scanResults) {
      await this.taskExecution.SaveScanEvent(
        new MobileScanEventEntity({
          TaskId: task.MobileTaskId,
          TaskCode: mobileTask?.TaskCode ?? task.TaskCode,
          WarehouseId: task.WarehouseId,
          OwnerId: task.OwnerId,
          ScanType: this.ToMobileScanType(scan.ScanType),
          RawValue: scan.RawValue,
          NormalizedValue: scan.RawValue.trim(),
          Result: MobileScanResult.Accepted,
          ResolvedObjectType: scan.ScanType,
          ResolvedObjectId: this.ResolveScanObjectId(task, scan.ScanType),
          ParsedValueJson: { ExpectedValue: scan.ExpectedValue },
          DeviceCode: request.DeviceCode ?? null,
          SessionId: request.SessionId ?? null,
          ActorUserId: actorUserId,
        }),
        manager,
      );
    }
  }

  private ToMobileScanType(scanType: string): MobileScanType {
    return scanType === 'Lpn' ? MobileScanType.Lpn : MobileScanType.Location;
  }

  private ResolveScanObjectId(task: PutawayTaskEntity, scanType: string): string | null {
    if (scanType === 'TargetLocation') return task.TargetLocationId;
    if (scanType === 'SourceLocation') return task.SourceLocationId;
    if (scanType === 'Lpn') return task.InboundLpnId ?? task.LpnCode ?? task.SsccCode;
    return null;
  }

  private BuildOutbox(
    outboxId: string,
    task: PutawayTaskEntity,
    transaction: InventoryTransactionEntity,
    movement: InventoryMovementEntity,
  ): OutboxMessageEntity {
    const idempotencyDigest = createHash('sha256').update(transaction.IdempotencyKey).digest('hex').slice(0, 24);
    return new OutboxMessageEntity({
      Id: outboxId,
      MessageId: `PutawayConfirmed:${task.Id}:${idempotencyDigest}`,
      EventType: 'PutawayConfirmed',
      Version: '1.0',
      BusinessReference: task.TaskCode,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: task.WarehouseCode ?? task.WarehouseId,
      OwnerContext: task.OwnerCode ?? task.OwnerId,
      EventTime: transaction.PostedAt,
      CorrelationId: transaction.Id,
      CausationId: task.Id,
      Payload: {
        PutawayTask: PutawayTaskToAuditJson(task),
        InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(transaction),
        InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(movement),
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: transaction.PostedBy,
    });
  }

  private async AuditBlocked(
    context: AuditContext,
    task: PutawayTaskEntity,
    reason: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.audited.Run(async () => ({
      result: undefined,
      entry: BuildPutawayTaskAudit(context, task, {
        Action: ActionCode.Update,
        Result: AuditResult.Failed,
        BeforeJson: PutawayTaskToAuditJson(task),
        AfterJson: { Decision: 'Blocked', Reason: reason, ...details },
      }),
    }));
  }
}
