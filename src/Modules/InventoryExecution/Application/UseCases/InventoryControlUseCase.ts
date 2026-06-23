import { createHash, randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  ChangeInventoryStatusDto,
  MoveInventoryInternalDto,
} from '@modules/InventoryExecution/Application/DTOs/InventoryControlDto';
import { InventoryControlResultDto } from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { InventoryTransactionDtoMapper } from '@modules/InventoryExecution/Application/Mappers/InventoryTransactionDtoMapper';
import { AssertInventoryMovementPermission } from '@modules/InventoryExecution/Application/UseCases/PutawayTaskPermission';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { InventoryMovementStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryMovementStatus';
import { InventoryTransactionStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionStatus';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';

type InventoryControlEventType = 'InventoryStatusChanged' | 'InventoryMoved';
type InventoryControlOperation = 'StatusChange' | 'InternalMove';

interface ReasonDecision {
  ReasonCode: string;
  ReasonCodeId: string;
}

interface SourceInventoryContext {
  SourceBalance: InventoryBalanceEntity;
  SourceDimension: InventoryDimensionEntity;
  SourceStatus: InventoryStatusEntity;
  SourceLocation: LocationEntity | null;
}

interface MutationPlan {
  Operation: InventoryControlOperation;
  TransactionType: InventoryTransactionType;
  EventType: InventoryControlEventType;
  TargetStatus: InventoryStatusEntity;
  TargetLocation: LocationEntity;
  Quantity: number;
  ReasonCode: string;
  ReasonCodeId: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  PayloadFingerprint: string;
}

interface BalanceMutationResult {
  SourceBalance: InventoryBalanceEntity;
  TargetBalance: InventoryBalanceEntity;
  SourceDimension: InventoryDimensionEntity;
  TargetDimension: InventoryDimensionEntity;
}

class InventoryControlDuplicateResult extends Error {
  constructor(public readonly Result: InventoryControlResultDto) {
    super('Inventory control duplicate result');
  }
}

const FORBIDDEN_INVENTORY_STATUS_CODES = new Set(['STORED', 'GATE_OUT', 'GOODS_ISSUE_POSTED', 'SHIPPED']);
const MOVABLE_INTERNAL_STATUS_CODES = new Set(['AVAILABLE', 'HOLD', 'QUARANTINE', 'DAMAGED', 'REJECTED']);

export class InventoryControlUseCase {
  constructor(
    private readonly inventoryTransactions: IInventoryTransactionRepository,
    private readonly inventoryStatuses: IInventoryStatusRepository,
    private readonly inventoryDimensions: IInventoryDimensionRepository,
    private readonly inventoryBalances: IInventoryBalanceRepository,
    private readonly locations: ILocationRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly dimensionKeyService: InventoryDimensionKeyService,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async ChangeStatus(
    request: ChangeInventoryStatusDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InventoryControlResultDto> {
    const normalized = this.NormalizeStatusRequest(request);
    this.AssertBaseRequest(normalized);
    const source = await this.LoadSourceInventory(normalized.SourceBalanceId);

    try {
      await this.AssertStockControlPermission(source, context);
      const reason = await this.ResolveReason(normalized.ReasonCode, ActionCode.Update, normalized.EvidenceRefs ?? []);
      const targetStatus = await this.ResolveTargetStatus(normalized.TargetInventoryStatusCode);
      if (targetStatus.StatusCode === source.SourceStatus.StatusCode) {
        throw new BusinessRuleException('Target InventoryStatus must be different from source InventoryStatus', {
          InventoryStatusCode: targetStatus.StatusCode,
        });
      }
      const sourceLocation = await this.ResolveSourceLocation(source);
      const plan = this.BuildPlan('StatusChange', source, {
        TargetStatus: targetStatus,
        TargetLocation: sourceLocation,
        Quantity: normalized.Quantity,
        ReasonCode: reason.ReasonCode,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: normalized.ReasonNote ?? null,
        EvidenceRefs: normalized.EvidenceRefs ?? [],
        IdempotencyKey: normalized.IdempotencyKey,
        PayloadFingerprint: this.BuildPayloadFingerprint('StatusChange', normalized, source, {
          TargetInventoryStatusCode: targetStatus.StatusCode,
          TargetLocationId: sourceLocation.Id,
        }),
      });
      const duplicate = await this.inventoryTransactions.FindTransactionByTypeAndIdempotencyKey(
        plan.TransactionType,
        plan.IdempotencyKey,
      );
      if (duplicate) return await this.BuildDuplicateResult(duplicate, plan);
      return await this.ExecutePostWithIdempotency(source, plan, context);
    } catch (error) {
      if (error instanceof InventoryControlDuplicateResult) {
        return error.Result;
      }
      if (error instanceof BusinessRuleException) {
        await this.AuditBlocked(
          context,
          source,
          'StatusChange',
          error.message,
          (error.Details ?? {}) as Record<string, unknown>,
        );
      }
      throw error;
    }
  }

  public async MoveInternal(
    request: MoveInventoryInternalDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InventoryControlResultDto> {
    const normalized = this.NormalizeMoveRequest(request);
    this.AssertBaseRequest(normalized);
    const source = await this.LoadSourceInventory(normalized.SourceBalanceId);

    try {
      await this.AssertStockControlPermission(source, context);
      const reason = await this.ResolveReason(normalized.ReasonCode, ActionCode.Adjust, normalized.EvidenceRefs ?? []);
      this.AssertMovableStatus(source.SourceStatus);
      const targetLocation = await this.ResolveTargetLocation(normalized.TargetLocationId, source.SourceDimension);
      if (targetLocation.Id === source.SourceDimension.LocationId) {
        throw new BusinessRuleException('TargetLocationId must be different from source LocationId', {
          TargetLocationId: targetLocation.Id,
        });
      }
      const plan = this.BuildPlan('InternalMove', source, {
        TargetStatus: source.SourceStatus,
        TargetLocation: targetLocation,
        Quantity: normalized.Quantity,
        ReasonCode: reason.ReasonCode,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: normalized.ReasonNote ?? null,
        EvidenceRefs: normalized.EvidenceRefs ?? [],
        IdempotencyKey: normalized.IdempotencyKey,
        PayloadFingerprint: this.BuildPayloadFingerprint('InternalMove', normalized, source, {
          TargetInventoryStatusCode: source.SourceStatus.StatusCode,
          TargetLocationId: targetLocation.Id,
        }),
      });
      const duplicate = await this.inventoryTransactions.FindTransactionByTypeAndIdempotencyKey(
        plan.TransactionType,
        plan.IdempotencyKey,
      );
      if (duplicate) return await this.BuildDuplicateResult(duplicate, plan);
      return await this.ExecutePostWithIdempotency(source, plan, context);
    } catch (error) {
      if (error instanceof InventoryControlDuplicateResult) {
        return error.Result;
      }
      if (error instanceof BusinessRuleException) {
        await this.AuditBlocked(
          context,
          source,
          'InternalMove',
          error.message,
          (error.Details ?? {}) as Record<string, unknown>,
        );
      }
      throw error;
    }
  }

  private NormalizeStatusRequest(request: ChangeInventoryStatusDto): ChangeInventoryStatusDto {
    return {
      SourceBalanceId: request.SourceBalanceId?.trim() ?? '',
      TargetInventoryStatusCode: request.TargetInventoryStatusCode?.trim().toUpperCase() ?? '',
      Quantity: Number(request.Quantity),
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || null,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: (request.EvidenceRefs ?? []).map((item) => item.trim()).filter(Boolean),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
  }

  private NormalizeMoveRequest(request: MoveInventoryInternalDto): MoveInventoryInternalDto {
    return {
      SourceBalanceId: request.SourceBalanceId?.trim() ?? '',
      TargetLocationId: request.TargetLocationId?.trim() ?? '',
      Quantity: Number(request.Quantity),
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || null,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: (request.EvidenceRefs ?? []).map((item) => item.trim()).filter(Boolean),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
  }

  private AssertBaseRequest(request: { SourceBalanceId: string; Quantity: number; IdempotencyKey: string }): void {
    if (!request.SourceBalanceId) throw new BusinessRuleException('SourceBalanceId is required');
    if (!Number.isFinite(request.Quantity) || request.Quantity <= 0) {
      throw new BusinessRuleException('Quantity must be greater than zero');
    }
    if (!request.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required');
  }

  private async LoadSourceInventory(sourceBalanceId: string): Promise<SourceInventoryContext> {
    const sourceBalance = await this.inventoryBalances.FindById(sourceBalanceId);
    if (!sourceBalance)
      throw new NotFoundException('Source inventory balance not found', { SourceBalanceId: sourceBalanceId });
    const sourceDimension = await this.inventoryDimensions.FindById(sourceBalance.DimensionId);
    if (!sourceDimension)
      throw new NotFoundException('Source inventory dimension not found', { DimensionId: sourceBalance.DimensionId });
    const sourceStatus = await this.inventoryStatuses.FindById(sourceDimension.InventoryStatusId);
    if (!sourceStatus)
      throw new BusinessRuleException('Source InventoryStatus foundation record is missing', {
        InventoryStatusId: sourceDimension.InventoryStatusId,
      });
    const sourceLocation = await this.locations.FindById(sourceDimension.LocationId);
    return {
      SourceBalance: sourceBalance,
      SourceDimension: sourceDimension,
      SourceStatus: sourceStatus,
      SourceLocation: sourceLocation,
    };
  }

  private async AssertStockControlPermission(source: SourceInventoryContext, context: AuditContext): Promise<void> {
    const scope = { WarehouseId: source.SourceDimension.WarehouseId, OwnerId: source.SourceDimension.OwnerId };
    await AssertInventoryMovementPermission(this.permissionChecker, context.ActorUserId, ActionCode.Create, scope);
    await AssertInventoryMovementPermission(this.permissionChecker, context.ActorUserId, ActionCode.Adjust, scope);
  }

  private async ResolveReason(
    reasonCode: string | null | undefined,
    action: ActionCode,
    evidenceRefs: string[],
  ): Promise<ReasonDecision> {
    if (!reasonCode) throw new BusinessRuleException('ReasonCode is required for inventory status/movement control');
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: action,
      ObjectType: ObjectType.InventoryMovement,
    });
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for this inventory control reason', {
        ReasonCode: reasonCode,
        Action: action,
      });
    }
    if (reason.ApprovalRequired) {
      throw new BusinessRuleException('Approval-required reason is not supported by V1-15 inventory control', {
        ReasonCode: reasonCode,
        Action: action,
      });
    }
    return { ReasonCode: reasonCode, ReasonCodeId: reason.ReasonCodeId };
  }

  private async ResolveTargetStatus(targetInventoryStatusCode: string): Promise<InventoryStatusEntity> {
    if (!targetInventoryStatusCode) throw new BusinessRuleException('TargetInventoryStatusCode is required');
    if (FORBIDDEN_INVENTORY_STATUS_CODES.has(targetInventoryStatusCode)) {
      throw new BusinessRuleException('TargetInventoryStatusCode is a workflow milestone, not InventoryStatus', {
        TargetInventoryStatusCode: targetInventoryStatusCode,
      });
    }
    const status = await this.inventoryStatuses.FindByCode(targetInventoryStatusCode);
    if (!status) {
      throw new BusinessRuleException('Target InventoryStatus foundation code not found', {
        TargetInventoryStatusCode: targetInventoryStatusCode,
      });
    }
    if (status.IsMilestone) {
      throw new BusinessRuleException('TargetInventoryStatusCode is a workflow milestone, not InventoryStatus', {
        TargetInventoryStatusCode: targetInventoryStatusCode,
      });
    }
    return status;
  }

  private AssertMovableStatus(sourceStatus: InventoryStatusEntity): void {
    if (
      FORBIDDEN_INVENTORY_STATUS_CODES.has(sourceStatus.StatusCode) ||
      !MOVABLE_INTERNAL_STATUS_CODES.has(sourceStatus.StatusCode)
    ) {
      throw new BusinessRuleException('Source InventoryStatus is not movable by internal movement in V1-15', {
        SourceInventoryStatusCode: sourceStatus.StatusCode,
      });
    }
  }

  private async ResolveSourceLocation(source: SourceInventoryContext): Promise<LocationEntity> {
    if (source.SourceLocation) return source.SourceLocation;
    const location = await this.locations.FindById(source.SourceDimension.LocationId);
    if (!location)
      throw new BusinessRuleException('Source location not found for inventory control', {
        SourceLocationId: source.SourceDimension.LocationId,
      });
    return location;
  }

  private async ResolveTargetLocation(
    targetLocationId: string,
    sourceDimension: InventoryDimensionEntity,
  ): Promise<LocationEntity> {
    if (!targetLocationId) throw new BusinessRuleException('TargetLocationId is required');
    const targetLocation = await this.locations.FindById(targetLocationId);
    if (!targetLocation)
      throw new NotFoundException('Target location not found', { TargetLocationId: targetLocationId });
    if (targetLocation.WarehouseId !== sourceDimension.WarehouseId) {
      throw new BusinessRuleException('Internal movement target location must be in the same warehouse', {
        SourceWarehouseId: sourceDimension.WarehouseId,
        TargetWarehouseId: targetLocation.WarehouseId,
      });
    }
    if (targetLocation.LocationStatus !== LocationStatus.Active) {
      throw new BusinessRuleException('Internal movement target location must be active', {
        TargetLocationId: targetLocation.Id,
        LocationStatus: targetLocation.LocationStatus,
      });
    }
    return targetLocation;
  }

  private BuildPlan(
    operation: InventoryControlOperation,
    source: SourceInventoryContext,
    input: {
      TargetStatus: InventoryStatusEntity;
      TargetLocation: LocationEntity;
      Quantity: number;
      ReasonCode: string;
      ReasonCodeId: string;
      ReasonNote: string | null;
      EvidenceRefs: string[];
      IdempotencyKey: string;
      PayloadFingerprint: string;
    },
  ): MutationPlan {
    void source;
    return {
      Operation: operation,
      TransactionType:
        operation === 'StatusChange' ? InventoryTransactionType.StatusChange : InventoryTransactionType.InternalMove,
      EventType: operation === 'StatusChange' ? 'InventoryStatusChanged' : 'InventoryMoved',
      TargetStatus: input.TargetStatus,
      TargetLocation: input.TargetLocation,
      Quantity: input.Quantity,
      ReasonCode: input.ReasonCode,
      ReasonCodeId: input.ReasonCodeId,
      ReasonNote: input.ReasonNote,
      EvidenceRefs: input.EvidenceRefs,
      IdempotencyKey: input.IdempotencyKey,
      PayloadFingerprint: input.PayloadFingerprint,
    };
  }

  private async PostInventoryControl(
    source: SourceInventoryContext,
    plan: MutationPlan,
    context: AuditContext,
  ): Promise<InventoryControlResultDto> {
    const now = new Date();
    const transactionId = randomUUID();
    const movementId = randomUUID();
    const outboxId = randomUUID();

    return await this.audited.Run(async (manager) => {
      const lockedSourceBalance = await this.LockSourceBalance(source, manager);
      const duplicateAfterLock = await this.inventoryTransactions.FindTransactionByTypeAndIdempotencyKey(
        plan.TransactionType,
        plan.IdempotencyKey,
        manager,
      );
      if (duplicateAfterLock)
        throw new InventoryControlDuplicateResult(await this.BuildDuplicateResult(duplicateAfterLock, plan, manager));

      const balances = await this.ApplyBalanceMovement(source, plan, context.ActorUserId, manager, lockedSourceBalance);
      const transaction = this.BuildTransaction(
        transactionId,
        movementId,
        outboxId,
        source,
        balances,
        plan,
        now,
        context.ActorUserId,
      );
      const movement = this.BuildMovement(movementId, transactionId, source, balances, plan, now, context.ActorUserId);
      const postedTransaction = await this.inventoryTransactions.CreateTransaction(transaction, manager);
      const postedMovement = await this.inventoryTransactions.CreateMovement(movement, manager);
      postedTransaction.InventoryMovementId = postedMovement.Id;
      const savedTransaction = await this.inventoryTransactions.SaveTransaction(postedTransaction, manager);
      const outbox = this.BuildOutbox(outboxId, savedTransaction, postedMovement, balances, plan);
      await this.integrations.CreateOutboxMessage(outbox, manager);

      const result: InventoryControlResultDto = {
        InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(savedTransaction),
        InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(postedMovement),
        SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(balances.SourceBalance),
        TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(balances.TargetBalance),
        OutboxMessageId: outboxId,
        EventType: plan.EventType,
        IsDuplicate: false,
      };

      return {
        result,
        entry: this.BuildAudit(context, source, postedMovement, plan, {
          BeforeJson: this.SourceToAuditJson(source),
          AfterJson: { ...result, TargetDimension: this.DimensionToAuditJson(balances.TargetDimension) },
          Result: AuditResult.Success,
        }),
      };
    });
  }

  private async ExecutePostWithIdempotency(
    source: SourceInventoryContext,
    plan: MutationPlan,
    context: AuditContext,
  ): Promise<InventoryControlResultDto> {
    try {
      return await this.PostInventoryControl(source, plan, context);
    } catch (error) {
      if (error instanceof InventoryControlDuplicateResult) {
        return error.Result;
      }
      if (error instanceof ConflictException) {
        const duplicate = await this.inventoryTransactions.FindTransactionByTypeAndIdempotencyKey(
          plan.TransactionType,
          plan.IdempotencyKey,
        );
        if (duplicate) return await this.BuildDuplicateResult(duplicate, plan);
      }
      throw error;
    }
  }

  private async LockSourceBalance(
    source: SourceInventoryContext,
    manager: EntityManager,
  ): Promise<InventoryBalanceEntity> {
    const lockedSourceBalance = await this.inventoryBalances.FindByDimensionIdForUpdate(
      source.SourceDimension.Id,
      manager,
    );
    if (!lockedSourceBalance || lockedSourceBalance.Id !== source.SourceBalance.Id) {
      throw new BusinessRuleException('Source inventory balance could not be locked for inventory control', {
        SourceBalanceId: source.SourceBalance.Id,
      });
    }
    return lockedSourceBalance;
  }

  private async ApplyBalanceMovement(
    source: SourceInventoryContext,
    plan: MutationPlan,
    actorUserId: string | null,
    manager: EntityManager,
    lockedSourceBalance: InventoryBalanceEntity,
  ): Promise<BalanceMutationResult> {
    const remainingSourceQty = lockedSourceBalance.QtyOnHand - plan.Quantity;
    if (remainingSourceQty < 0) {
      throw new BusinessRuleException('Inventory control would create negative source balance', {
        SourceBalanceId: lockedSourceBalance.Id,
        QtyOnHand: lockedSourceBalance.QtyOnHand,
        Quantity: plan.Quantity,
      });
    }
    if (remainingSourceQty < lockedSourceBalance.QtyReserved) {
      throw new BusinessRuleException('Inventory control would create negative source available balance', {
        SourceBalanceId: lockedSourceBalance.Id,
        QtyReserved: lockedSourceBalance.QtyReserved,
        RemainingQtyOnHand: remainingSourceQty,
        Quantity: plan.Quantity,
      });
    }

    const targetDimension = await this.inventoryDimensions.FindOrCreateByHashForUpdate(
      this.BuildTargetDimension(source.SourceDimension, plan, actorUserId),
      manager,
    );
    const targetBalance = await this.inventoryBalances.FindOrCreateByDimensionIdForUpdate(
      new InventoryBalanceEntity({
        Id: randomUUID(),
        DimensionId: targetDimension.Id,
        QtyOnHand: 0,
        QtyReserved: 0,
        SourceSystem: 'LTA-WMS',
        ReferenceId: plan.IdempotencyKey,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
        CreatedBy: actorUserId,
        UpdatedBy: actorUserId,
      }),
      manager,
    );

    const savedSource = await this.inventoryBalances.Update(
      this.BuildBalance(lockedSourceBalance, remainingSourceQty, actorUserId, plan.IdempotencyKey),
      manager,
    );
    const savedTarget = await this.inventoryBalances.Update(
      this.BuildBalance(targetBalance, targetBalance.QtyOnHand + plan.Quantity, actorUserId, plan.IdempotencyKey),
      manager,
    );
    return {
      SourceBalance: savedSource,
      TargetBalance: savedTarget,
      SourceDimension: source.SourceDimension,
      TargetDimension: targetDimension,
    };
  }

  private BuildTargetDimension(
    sourceDimension: InventoryDimensionEntity,
    plan: MutationPlan,
    actorUserId: string | null,
  ): InventoryDimensionEntity {
    const input = {
      OwnerId: sourceDimension.OwnerId,
      SkuId: sourceDimension.SkuId,
      WarehouseId: sourceDimension.WarehouseId,
      LocationId: plan.TargetLocation.Id,
      InventoryStatusId: plan.TargetStatus.Id,
      UomId: sourceDimension.UomId,
      LpnCode: sourceDimension.LpnCode,
      LotNumber: sourceDimension.LotNumber,
      ExpiryDate: sourceDimension.ExpiryDate,
      SerialNumber: sourceDimension.SerialNumber,
      ProductionDate: sourceDimension.ProductionDate,
      CountryOfOrigin: sourceDimension.CountryOfOrigin,
      CustomsStatus: sourceDimension.CustomsStatus,
    };
    return new InventoryDimensionEntity({
      Id: randomUUID(),
      ...input,
      DimensionKeyHash: this.dimensionKeyService.BuildHash(input),
      SourceSystem: sourceDimension.SourceSystem ?? 'LTA-WMS',
      ReferenceId: plan.IdempotencyKey,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
      CreatedBy: actorUserId,
      UpdatedBy: actorUserId,
    });
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
    source: SourceInventoryContext,
    balances: BalanceMutationResult,
    plan: MutationPlan,
    now: Date,
    actorUserId: string | null,
  ): InventoryTransactionEntity {
    return new InventoryTransactionEntity({
      Id: transactionId,
      TransactionCode: `ITX-${transactionId.slice(0, 8).toUpperCase()}`,
      TransactionType: plan.TransactionType,
      TransactionStatus: InventoryTransactionStatus.Posted,
      PutawayTaskId: null,
      PutawayTaskCode: null,
      InventoryMovementId: movementId,
      OwnerId: source.SourceDimension.OwnerId,
      WarehouseId: source.SourceDimension.WarehouseId,
      SkuId: source.SourceDimension.SkuId,
      UomId: source.SourceDimension.UomId,
      Quantity: plan.Quantity,
      FromInventoryStatusCode: source.SourceStatus.StatusCode,
      ToInventoryStatusCode: plan.TargetStatus.StatusCode,
      FromLocationId: source.SourceDimension.LocationId,
      FromLocationCode: source.SourceLocation?.LocationCode ?? null,
      ToLocationId: plan.TargetLocation.Id,
      ToLocationCode: plan.TargetLocation.LocationCode,
      LpnCode: source.SourceDimension.LpnCode,
      IdempotencyKey: plan.IdempotencyKey,
      OutboxMessageId: outboxId,
      ReasonCode: plan.ReasonCode,
      ReasonCodeId: plan.ReasonCodeId,
      ReasonNote: plan.ReasonNote,
      EvidenceRefs: plan.EvidenceRefs,
      PostedAt: now,
      PostedBy: actorUserId,
    });
  }

  private BuildMovement(
    movementId: string,
    transactionId: string,
    source: SourceInventoryContext,
    balances: BalanceMutationResult,
    plan: MutationPlan,
    now: Date,
    actorUserId: string | null,
  ): InventoryMovementEntity {
    return new InventoryMovementEntity({
      Id: movementId,
      MovementCode: `IMV-${movementId.slice(0, 8).toUpperCase()}`,
      MovementStatus: InventoryMovementStatus.Posted,
      InventoryTransactionId: transactionId,
      PutawayTaskId: null,
      PutawayTaskCode: null,
      OwnerId: source.SourceDimension.OwnerId,
      WarehouseId: source.SourceDimension.WarehouseId,
      SkuId: source.SourceDimension.SkuId,
      UomId: source.SourceDimension.UomId,
      Quantity: plan.Quantity,
      FromDimensionId: balances.SourceDimension.Id,
      FromBalanceId: balances.SourceBalance.Id,
      FromLocationId: source.SourceDimension.LocationId,
      FromLocationCode: source.SourceLocation?.LocationCode ?? null,
      FromInventoryStatusCode: source.SourceStatus.StatusCode,
      ToDimensionId: balances.TargetDimension.Id,
      ToBalanceId: balances.TargetBalance.Id,
      ToLocationId: plan.TargetLocation.Id,
      ToLocationCode: plan.TargetLocation.LocationCode,
      ToInventoryStatusCode: plan.TargetStatus.StatusCode,
      LpnCode: source.SourceDimension.LpnCode,
      ScanEvidenceJson: {
        Operation: plan.Operation,
        EventType: plan.EventType,
        ReasonCode: plan.ReasonCode,
        ReasonNote: plan.ReasonNote,
        EvidenceRefs: plan.EvidenceRefs,
        InventoryControlPayloadFingerprint: plan.PayloadFingerprint,
      },
      CreatedAt: now,
      CreatedBy: actorUserId,
    });
  }

  private BuildOutbox(
    outboxId: string,
    transaction: InventoryTransactionEntity,
    movement: InventoryMovementEntity,
    balances: BalanceMutationResult,
    plan: MutationPlan,
  ): OutboxMessageEntity {
    const idempotencyDigest = createHash('sha256').update(plan.IdempotencyKey).digest('hex').slice(0, 24);
    return new OutboxMessageEntity({
      Id: outboxId,
      MessageId: `${plan.EventType}:${balances.SourceBalance.Id}:${idempotencyDigest}`,
      EventType: plan.EventType,
      Version: '1.0',
      BusinessReference: transaction.TransactionCode,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: transaction.WarehouseCode ?? transaction.WarehouseId,
      OwnerContext: transaction.OwnerCode ?? transaction.OwnerId,
      EventTime: transaction.PostedAt,
      CorrelationId: transaction.Id,
      CausationId: balances.SourceBalance.Id,
      Payload: {
        EventType: plan.EventType,
        InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(transaction),
        InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(movement),
        SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(balances.SourceBalance),
        TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(balances.TargetBalance),
        SourceDimension: this.DimensionToAuditJson(balances.SourceDimension),
        TargetDimension: this.DimensionToAuditJson(balances.TargetDimension),
        ReasonCode: plan.ReasonCode,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: transaction.PostedBy,
    });
  }

  private async BuildDuplicateResult(
    transaction: InventoryTransactionEntity,
    plan: MutationPlan,
    manager?: EntityManager,
  ): Promise<InventoryControlResultDto> {
    const movement = await this.inventoryTransactions.FindMovementByTransactionId(transaction.Id, manager);
    if (!movement) throw new ConflictException('Inventory control duplicate transaction has no movement record');
    const existingFingerprint = this.ReadPayloadFingerprint(movement);
    if (existingFingerprint !== plan.PayloadFingerprint) {
      throw new ConflictException('Inventory control idempotency key already used for a different payload');
    }
    const sourceBalance = await this.inventoryBalances.FindById(movement.FromBalanceId);
    const targetBalance = await this.inventoryBalances.FindById(movement.ToBalanceId);
    if (!sourceBalance || !targetBalance) {
      throw new ConflictException('Inventory control duplicate transaction has incomplete balance records');
    }
    return {
      InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(transaction),
      InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(movement),
      SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(sourceBalance),
      TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(targetBalance),
      OutboxMessageId: transaction.OutboxMessageId,
      EventType: plan.EventType,
      IsDuplicate: true,
    };
  }

  private ReadPayloadFingerprint(movement: InventoryMovementEntity): string | null {
    const fingerprint = movement.ScanEvidenceJson.InventoryControlPayloadFingerprint;
    return typeof fingerprint === 'string' ? fingerprint : null;
  }

  private BuildPayloadFingerprint(
    operation: InventoryControlOperation,
    request: ChangeInventoryStatusDto | MoveInventoryInternalDto,
    source: SourceInventoryContext,
    target: { TargetInventoryStatusCode: string; TargetLocationId: string },
  ): string {
    const payload = {
      Operation: operation,
      SourceBalanceId: request.SourceBalanceId,
      SourceDimensionId: source.SourceDimension.Id,
      SourceInventoryStatusCode: source.SourceStatus.StatusCode,
      Quantity: request.Quantity,
      TargetInventoryStatusCode: target.TargetInventoryStatusCode,
      TargetLocationId: target.TargetLocationId,
      ReasonCode: request.ReasonCode ?? null,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private BuildAudit(
    context: AuditContext,
    source: SourceInventoryContext,
    movement: InventoryMovementEntity,
    plan: MutationPlan,
    input: {
      BeforeJson?: Record<string, unknown> | null;
      AfterJson?: Record<string, unknown> | null;
      Result: AuditResult;
    },
  ) {
    return MergeAuditContext(context, {
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.InventoryMovement,
      ObjectId: movement.Id,
      ObjectCode: movement.MovementCode,
      BeforeJson: input.BeforeJson ?? null,
      AfterJson: input.AfterJson ?? null,
      ReasonCodeId: plan.ReasonCodeId,
      ReasonNote: plan.ReasonNote ?? plan.ReasonCode,
      EvidenceRefs: plan.EvidenceRefs.length ? plan.EvidenceRefs : null,
      ReferenceType: plan.Operation,
      ReferenceId: movement.Id,
      WarehouseId: source.SourceDimension.WarehouseId,
      OwnerId: source.SourceDimension.OwnerId,
      ScopeJson: { WarehouseId: source.SourceDimension.WarehouseId, OwnerId: source.SourceDimension.OwnerId },
      Result: input.Result,
    });
  }

  private async AuditBlocked(
    context: AuditContext,
    source: SourceInventoryContext,
    operation: InventoryControlOperation,
    reason: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.audited.Run(async () => ({
      result: undefined,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Adjust,
        ObjectType: ObjectType.InventoryMovement,
        ObjectId: source.SourceBalance.Id,
        ObjectCode: source.SourceBalance.Id,
        BeforeJson: this.SourceToAuditJson(source),
        AfterJson: { Decision: 'Blocked', Operation: operation, Reason: reason, ...details },
        ReferenceType: operation,
        ReferenceId: source.SourceBalance.Id,
        WarehouseId: source.SourceDimension.WarehouseId,
        OwnerId: source.SourceDimension.OwnerId,
        ScopeJson: { WarehouseId: source.SourceDimension.WarehouseId, OwnerId: source.SourceDimension.OwnerId },
        Result: AuditResult.Failed,
      }),
    }));
  }

  private SourceToAuditJson(source: SourceInventoryContext): Record<string, unknown> {
    return {
      SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(source.SourceBalance),
      SourceDimension: this.DimensionToAuditJson(source.SourceDimension),
      SourceInventoryStatusCode: source.SourceStatus.StatusCode,
      SourceLocationCode: source.SourceLocation?.LocationCode ?? null,
    };
  }

  private DimensionToAuditJson(dimension: InventoryDimensionEntity): Record<string, unknown> {
    return {
      Id: dimension.Id,
      OwnerId: dimension.OwnerId,
      SkuId: dimension.SkuId,
      WarehouseId: dimension.WarehouseId,
      LocationId: dimension.LocationId,
      InventoryStatusId: dimension.InventoryStatusId,
      UomId: dimension.UomId,
      LpnCode: dimension.LpnCode,
      LotNumber: dimension.LotNumber,
      ExpiryDate: dimension.ExpiryDate?.toISOString().slice(0, 10) ?? null,
      SerialNumber: dimension.SerialNumber,
      ProductionDate: dimension.ProductionDate?.toISOString().slice(0, 10) ?? null,
      CountryOfOrigin: dimension.CountryOfOrigin,
      CustomsStatus: dimension.CustomsStatus,
    };
  }
}
