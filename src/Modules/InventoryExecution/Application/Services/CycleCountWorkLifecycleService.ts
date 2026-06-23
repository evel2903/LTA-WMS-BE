import { createHash, randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  CreateCycleCountWorkDto,
  CycleCountAdjustmentResultDto,
  CycleCountMutationResultDto,
  ListCycleCountWorksDto,
  ListCycleCountWorksResultDto,
  PostCycleCountAdjustmentDto,
  RecountCycleCountWorkDto,
  SubmitCycleCountWorkDto,
  UnlockCycleCountWorkDto,
} from '@modules/InventoryExecution/Application/DTOs/CycleCountWorkDto';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { ICycleCountWorkRepository } from '@modules/InventoryExecution/Application/Interfaces/ICycleCountWorkRepository';
import { CycleCountWorkDtoMapper } from '@modules/InventoryExecution/Application/Mappers/CycleCountWorkDtoMapper';
import { InventoryTransactionDtoMapper } from '@modules/InventoryExecution/Application/Mappers/InventoryTransactionDtoMapper';
import { AssertInventoryMovementPermission } from '@modules/InventoryExecution/Application/UseCases/PutawayTaskPermission';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { CycleCountWorkEntity } from '@modules/InventoryExecution/Domain/Entities/CycleCountWorkEntity';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { CycleCountWorkStatus } from '@modules/InventoryExecution/Domain/Enums/CycleCountWorkStatus';
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
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';

interface ReasonDecision {
  ReasonCode: string;
  ReasonCodeId: string;
}

interface BalanceContext {
  Balance: InventoryBalanceEntity;
  Dimension: InventoryDimensionEntity;
  InventoryStatusCode: string;
  LocationCode: string | null;
}

class CycleCountAdjustmentDuplicateResult extends Error {
  constructor(public readonly Result: CycleCountAdjustmentResultDto) {
    super('Cycle count adjustment duplicate result');
  }
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

export class CycleCountWorkLifecycleService {
  constructor(
    private readonly cycleCountWorks: ICycleCountWorkRepository,
    private readonly inventoryControl: InventoryControlUseCase,
    private readonly inventoryTransactions: IInventoryTransactionRepository,
    private readonly approvalRequests: IApprovalRequestRepository,
    private readonly inventoryBalances: IInventoryBalanceRepository,
    private readonly inventoryDimensions: IInventoryDimensionRepository,
    private readonly inventoryStatuses: IInventoryStatusRepository,
    private readonly locations: ILocationRepository,
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Create(request: CreateCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    const normalized = this.NormalizeCreate(request);
    const fingerprint = this.Fingerprint('CreateCycleCountWork', normalized);
    const existing = await this.cycleCountWorks.FindByCreateIdempotencyKey(normalized.IdempotencyKey);
    if (existing) {
      this.AssertSameFingerprint(existing.CreatePayloadFingerprint, fingerprint);
      return { CycleCountWork: CycleCountWorkDtoMapper.ToDto(existing), InventoryControl: null, IsDuplicate: true };
    }

    const source = await this.LoadBalanceContext(normalized.SourceBalanceId);
    if (source.InventoryStatusCode === 'COUNTING_LOCKED') {
      throw new BusinessRuleException('Source balance is already COUNTING_LOCKED', {
        SourceBalanceId: normalized.SourceBalanceId,
      });
    }
    await this.AssertCycleCountPermission(context, ActionCode.Create, {
      WarehouseId: source.Dimension.WarehouseId,
      OwnerId: source.Dimension.OwnerId,
    });
    await this.AssertCycleCountPermission(context, ActionCode.Update, {
      WarehouseId: source.Dimension.WarehouseId,
      OwnerId: source.Dimension.OwnerId,
    });
    const reason = await this.ResolveCycleCountReason(
      normalized.ReasonCode,
      ActionCode.Update,
      normalized.EvidenceRefs ?? [],
    );

    const now = new Date();
    const created = await this.audited.Run(async (manager) => {
      const lock = await this.inventoryControl.ChangeStatusInTransaction(
        {
          SourceBalanceId: normalized.SourceBalanceId,
          TargetInventoryStatusCode: 'COUNTING_LOCKED',
          Quantity: normalized.Quantity,
          ReasonCode: normalized.ReasonCode,
          ReasonNote: normalized.ReasonNote,
          EvidenceRefs: normalized.EvidenceRefs,
          IdempotencyKey: normalized.IdempotencyKey,
        },
        context,
        manager,
      );
      const work = new CycleCountWorkEntity({
        Id: randomUUID(),
        CountCode: `CC-${now.getTime()}-${randomUUID().slice(0, 6).toUpperCase()}`,
        WorkStatus: CycleCountWorkStatus.CountingLocked,
        SourceBalanceId: normalized.SourceBalanceId,
        LockedBalanceId: lock.result.TargetBalance.BalanceId,
        OriginalInventoryStatusCode: source.InventoryStatusCode,
        WarehouseId: source.Dimension.WarehouseId,
        OwnerId: source.Dimension.OwnerId,
        SkuId: source.Dimension.SkuId,
        LocationId: source.Dimension.LocationId,
        LocationCode: source.LocationCode,
        UomId: source.Dimension.UomId,
        LpnCode: source.Dimension.LpnCode,
        ExpectedQuantity: normalized.Quantity,
        ToleranceQuantity: normalized.ToleranceQuantity ?? 0,
        LockTransactionId: lock.result.InventoryTransaction.Id,
        CreateIdempotencyKey: normalized.IdempotencyKey,
        CreatePayloadFingerprint: fingerprint,
        ReasonCode: normalized.ReasonCode,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: normalized.ReasonNote,
        EvidenceRefs: normalized.EvidenceRefs,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: context.ActorUserId,
        UpdatedBy: context.ActorUserId,
      });
      const saved = await this.cycleCountWorks.Create(work, manager);
      return {
        result: { Work: saved, Lock: lock.result },
        entry: [
          lock.entry,
          MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.CycleCount,
            ObjectId: saved.Id,
            ObjectCode: saved.CountCode,
            AfterJson: CycleCountWorkDtoMapper.ToDto(saved) as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'CycleCountLock',
            ReferenceId: lock.result.InventoryTransaction.Id,
            WarehouseId: saved.WarehouseId,
            OwnerId: saved.OwnerId,
            ScopeJson: this.Scope(saved),
            Result: AuditResult.Success,
          }),
        ],
      };
    });

    return {
      CycleCountWork: CycleCountWorkDtoMapper.ToDto(created.Work),
      InventoryControl: created.Lock,
      IsDuplicate: false,
    };
  }

  public async List(query: ListCycleCountWorksDto): Promise<ListCycleCountWorksResultDto> {
    if (!query.WarehouseId && !query.OwnerId) {
      throw new BusinessRuleException('WarehouseId or OwnerId filter is required for cycle count listing');
    }
    const page = Math.max(1, Number(query.Page ?? 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.PageSize ?? DEFAULT_PAGE_SIZE)));
    const result = await this.cycleCountWorks.List((page - 1) * pageSize, pageSize, {
      WarehouseId: query.WarehouseId?.trim() || undefined,
      OwnerId: query.OwnerId?.trim() || undefined,
      WorkStatus: query.WorkStatus,
    });
    return {
      Items: result.Items.map(CycleCountWorkDtoMapper.ToDto),
      Page: page,
      PageSize: pageSize,
      TotalItems: result.TotalItems,
      TotalPages: Math.max(1, Math.ceil(result.TotalItems / pageSize)),
    };
  }

  public async Get(id: string, context?: AuditContext): Promise<CycleCountMutationResultDto> {
    const work = await this.LoadWork(id);
    if (context) await this.AssertCycleCountPermission(context, ActionCode.Read, work);
    return { CycleCountWork: CycleCountWorkDtoMapper.ToDto(work), InventoryControl: null, IsDuplicate: false };
  }

  public async Submit(request: SubmitCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    const normalized = this.NormalizeSubmit(request);
    const work = await this.LoadWork(normalized.WorkId);
    await this.AssertCycleCountPermission(context, ActionCode.Update, work);
    const fingerprint = this.Fingerprint('SubmitCycleCountWork', normalized);
    if (work.SubmitIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(work.SubmitPayloadFingerprint, fingerprint);
      return { CycleCountWork: CycleCountWorkDtoMapper.ToDto(work), InventoryControl: null, IsDuplicate: true };
    }
    this.AssertWorkStatus(work, [CycleCountWorkStatus.CountingLocked, CycleCountWorkStatus.RecountRequired]);
    const reason = await this.ResolveCycleCountReason(
      normalized.ReasonCode,
      ActionCode.Update,
      normalized.EvidenceRefs ?? [],
    );
    const variance = this.ToQuantityScale(normalized.CountedQuantity - work.ExpectedQuantity);
    const overTolerance = Math.abs(variance) > this.ToQuantityScale(work.ToleranceQuantity);
    if (overTolerance && normalized.ApprovalRequestId) {
      await this.AssertApprovedAdjustment(work, normalized.ApprovalRequestId);
    }

    const updated = new CycleCountWorkEntity({
      ...work,
      WorkStatus:
        overTolerance && !normalized.ApprovalRequestId
          ? CycleCountWorkStatus.PendingReview
          : CycleCountWorkStatus.Accepted,
      CountedQuantity: normalized.CountedQuantity,
      VarianceQuantity: variance,
      ApprovalRequestId: normalized.ApprovalRequestId ?? work.ApprovalRequestId,
      SubmitIdempotencyKey: normalized.IdempotencyKey,
      SubmitPayloadFingerprint: fingerprint,
      ReasonCode: normalized.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
      UpdatedAt: new Date(),
      UpdatedBy: context.ActorUserId,
    });

    const saved = await this.audited.Run(async (manager) => {
      const persisted = await this.cycleCountWorks.Update(updated, manager);
      return {
        result: persisted,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.CycleCount,
          ObjectId: persisted.Id,
          ObjectCode: persisted.CountCode,
          BeforeJson: CycleCountWorkDtoMapper.ToDto(work) as unknown as Record<string, unknown>,
          AfterJson: CycleCountWorkDtoMapper.ToDto(persisted) as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
          EvidenceRefs: normalized.EvidenceRefs,
          ReferenceType: 'CycleCountSubmit',
          ReferenceId: persisted.Id,
          WarehouseId: persisted.WarehouseId,
          OwnerId: persisted.OwnerId,
          ScopeJson: this.Scope(persisted),
          Result: AuditResult.Success,
        }),
      };
    });

    return { CycleCountWork: CycleCountWorkDtoMapper.ToDto(saved), InventoryControl: null, IsDuplicate: false };
  }

  public async Recount(request: RecountCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    const normalized = this.NormalizeRecount(request);
    const work = await this.LoadWork(normalized.WorkId);
    await this.AssertCycleCountPermission(context, ActionCode.Update, work);
    this.AssertWorkStatus(work, [CycleCountWorkStatus.PendingReview, CycleCountWorkStatus.Submitted]);
    const reason = await this.ResolveCycleCountReason(
      normalized.ReasonCode,
      ActionCode.Update,
      normalized.EvidenceRefs ?? [],
    );
    const updated = new CycleCountWorkEntity({
      ...work,
      WorkStatus: CycleCountWorkStatus.RecountRequired,
      ReasonCode: normalized.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
      UpdatedAt: new Date(),
      UpdatedBy: context.ActorUserId,
    });

    const saved = await this.audited.Run(async (manager) => {
      const persisted = await this.cycleCountWorks.Update(updated, manager);
      return {
        result: persisted,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.CycleCount,
          ObjectId: persisted.Id,
          ObjectCode: persisted.CountCode,
          BeforeJson: CycleCountWorkDtoMapper.ToDto(work) as unknown as Record<string, unknown>,
          AfterJson: CycleCountWorkDtoMapper.ToDto(persisted) as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
          EvidenceRefs: normalized.EvidenceRefs,
          ReferenceType: 'CycleCountRecount',
          ReferenceId: persisted.Id,
          WarehouseId: persisted.WarehouseId,
          OwnerId: persisted.OwnerId,
          ScopeJson: this.Scope(persisted),
          Result: AuditResult.Success,
        }),
      };
    });

    return { CycleCountWork: CycleCountWorkDtoMapper.ToDto(saved), InventoryControl: null, IsDuplicate: false };
  }

  public async PostAdjustment(
    request: PostCycleCountAdjustmentDto,
    context: AuditContext,
  ): Promise<CycleCountAdjustmentResultDto> {
    const normalized = this.NormalizeAdjustment(request);
    const work = await this.LoadWork(normalized.WorkId);
    await this.AssertCycleCountPermission(context, ActionCode.Adjust, work);
    await AssertInventoryMovementPermission(this.permissionChecker, context.ActorUserId, ActionCode.Adjust, work);
    const fingerprint = this.BuildAdjustmentFingerprint(normalized, work);
    if (work.AdjustmentIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(work.AdjustmentPayloadFingerprint, fingerprint);
      return await this.BuildDuplicateAdjustmentResult(work, fingerprint);
    }
    const reason = await this.ResolveCycleCountReason(
      normalized.ReasonCode,
      ActionCode.Adjust,
      normalized.EvidenceRefs ?? [],
    );

    try {
      return await this.audited.Run(async (manager) => {
        const currentWork = await this.cycleCountWorks.FindByIdForUpdate(work.Id, manager);
        if (!currentWork) throw new NotFoundException('Cycle count work not found', { WorkId: work.Id });
        const currentFingerprint = this.BuildAdjustmentFingerprint(normalized, currentWork);
        if (currentWork.AdjustmentIdempotencyKey === normalized.IdempotencyKey) {
          this.AssertSameFingerprint(currentWork.AdjustmentPayloadFingerprint, currentFingerprint);
          throw new CycleCountAdjustmentDuplicateResult(
            await this.BuildDuplicateAdjustmentResult(currentWork, currentFingerprint),
          );
        }
        this.AssertWorkStatus(currentWork, [CycleCountWorkStatus.Accepted, CycleCountWorkStatus.PendingReview]);
        if (currentWork.CountedQuantity === null || currentWork.VarianceQuantity === null) {
          throw new BusinessRuleException('Cycle count must be submitted before adjustment', {
            WorkId: currentWork.Id,
          });
        }
        if (currentWork.VarianceQuantity === 0) {
          throw new BusinessRuleException('Cycle count adjustment requires non-zero variance', {
            WorkId: currentWork.Id,
          });
        }
        const approvalRequestId = normalized.ApprovalRequestId ?? currentWork.ApprovalRequestId;
        if (Math.abs(currentWork.VarianceQuantity) > this.ToQuantityScale(currentWork.ToleranceQuantity)) {
          if (!approvalRequestId) {
            throw new BusinessRuleException('Cycle count adjustment over tolerance requires approved ApprovalRequest', {
              WorkId: currentWork.Id,
            });
          }
          await this.AssertApprovedAdjustment(currentWork, approvalRequestId);
        }
        const locked = await this.LoadBalanceContext(currentWork.LockedBalanceId ?? '');
        if (locked.InventoryStatusCode !== 'COUNTING_LOCKED') {
          throw new BusinessRuleException('Cycle count adjustment must target COUNTING_LOCKED balance', {
            WorkId: currentWork.Id,
            LockedBalanceId: currentWork.LockedBalanceId,
          });
        }
        if (currentWork.CountedQuantity < locked.Balance.QtyReserved) {
          throw new BusinessRuleException('Cycle count adjustment would create negative available quantity', {
            WorkId: currentWork.Id,
            CountedQuantity: currentWork.CountedQuantity,
            QtyReserved: locked.Balance.QtyReserved,
          });
        }
        const lockedForUpdate = await this.inventoryBalances.FindByDimensionIdForUpdate(locked.Dimension.Id, manager);
        if (!lockedForUpdate || lockedForUpdate.Id !== locked.Balance.Id) {
          throw new BusinessRuleException('Locked balance could not be locked for cycle count adjustment', {
            LockedBalanceId: locked.Balance.Id,
          });
        }
        if (lockedForUpdate.QtyOnHand !== currentWork.ExpectedQuantity) {
          throw new ConflictException('Cycle count locked balance no longer matches expected quantity');
        }
        const duplicate = await this.inventoryTransactions.FindTransactionByTypeAndIdempotencyKey(
          InventoryTransactionType.CycleCountAdjustment,
          normalized.IdempotencyKey,
          manager,
        );
        if (duplicate) {
          throw new ConflictException('Cycle count adjustment idempotency key already exists');
        }
        const now = new Date();
        const transactionId = randomUUID();
        const movementId = randomUUID();
        const outboxId = randomUUID();
        const updatedBalance = await this.inventoryBalances.Update(
          new InventoryBalanceEntity({
            Id: lockedForUpdate.Id,
            DimensionId: lockedForUpdate.DimensionId,
            QtyOnHand: currentWork.CountedQuantity ?? 0,
            QtyReserved: lockedForUpdate.QtyReserved,
            SourceSystem: lockedForUpdate.SourceSystem ?? 'LTA-WMS',
            ReferenceId: normalized.IdempotencyKey,
            CreatedAt: lockedForUpdate.CreatedAt,
            UpdatedAt: now,
            CreatedBy: lockedForUpdate.CreatedBy,
            UpdatedBy: context.ActorUserId,
          }),
          manager,
        );
        const transaction = this.BuildAdjustmentTransaction(
          transactionId,
          movementId,
          outboxId,
          currentWork,
          locked,
          normalized.IdempotencyKey,
          reason,
          normalized,
          now,
          context.ActorUserId,
        );
        const movement = this.BuildAdjustmentMovement(
          movementId,
          transactionId,
          currentWork,
          locked,
          normalized,
          currentFingerprint,
          now,
          context.ActorUserId,
        );
        const createdTransaction = await this.inventoryTransactions.CreateTransaction(transaction, manager);
        const createdMovement = await this.inventoryTransactions.CreateMovement(movement, manager);
        createdTransaction.InventoryMovementId = createdMovement.Id;
        const savedTransaction = await this.inventoryTransactions.SaveTransaction(createdTransaction, manager);
        const updatedWork = await this.cycleCountWorks.Update(
          new CycleCountWorkEntity({
            ...currentWork,
            WorkStatus: CycleCountWorkStatus.AdjustmentPosted,
            ApprovalRequestId: approvalRequestId ?? null,
            AdjustmentTransactionId: savedTransaction.Id,
            AdjustmentIdempotencyKey: normalized.IdempotencyKey,
            AdjustmentPayloadFingerprint: currentFingerprint,
            ReasonCode: normalized.ReasonCode,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote,
            EvidenceRefs: normalized.EvidenceRefs,
            UpdatedAt: now,
            UpdatedBy: context.ActorUserId,
          }),
          manager,
        );
        await this.integrations.CreateOutboxMessage(
          this.BuildAdjustmentOutbox(outboxId, savedTransaction, createdMovement, updatedWork, locked, updatedBalance),
          manager,
        );
        const dto: CycleCountAdjustmentResultDto = {
          CycleCountWork: CycleCountWorkDtoMapper.ToDto(updatedWork),
          InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(savedTransaction),
          InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(createdMovement),
          SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(lockedForUpdate),
          TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(updatedBalance),
          OutboxMessageId: outboxId,
          EventType: 'AdjustmentPosted',
          IsDuplicate: false,
        };
        return {
          result: dto,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Adjust,
            ObjectType: ObjectType.CycleCount,
            ObjectId: updatedWork.Id,
            ObjectCode: updatedWork.CountCode,
            BeforeJson: CycleCountWorkDtoMapper.ToDto(currentWork) as unknown as Record<string, unknown>,
            AfterJson: dto as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'CycleCountAdjustment',
            ReferenceId: savedTransaction.Id,
            WarehouseId: updatedWork.WarehouseId,
            OwnerId: updatedWork.OwnerId,
            ScopeJson: this.Scope(updatedWork),
            Result: AuditResult.Success,
          }),
        };
      });
    } catch (error) {
      if (error instanceof CycleCountAdjustmentDuplicateResult) return error.Result;
      throw error;
    }
  }

  public async Unlock(request: UnlockCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    const normalized = this.NormalizeUnlock(request);
    const work = await this.LoadWork(normalized.WorkId);
    await this.AssertCycleCountPermission(context, ActionCode.Unlock, work);
    this.AssertWorkStatus(work, [CycleCountWorkStatus.Accepted, CycleCountWorkStatus.AdjustmentPosted]);
    const fingerprint = this.Fingerprint('UnlockCycleCountWork', normalized);
    if (work.UnlockIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(work.UnlockPayloadFingerprint, fingerprint);
      return { CycleCountWork: CycleCountWorkDtoMapper.ToDto(work), InventoryControl: null, IsDuplicate: true };
    }
    const locked = await this.LoadBalanceContext(work.LockedBalanceId ?? '');
    const reason = await this.ResolveCycleCountReason(
      normalized.ReasonCode,
      ActionCode.Update,
      normalized.EvidenceRefs ?? [],
    );
    if (locked.Balance.QtyOnHand <= 0) {
      throw new BusinessRuleException('Cycle count unlock requires positive locked quantity for status release', {
        WorkId: work.Id,
        LockedBalanceId: work.LockedBalanceId,
      });
    }
    const result = await this.audited.Run(async (manager) => {
      const unlock = await this.inventoryControl.ChangeStatusInTransaction(
        {
          SourceBalanceId: locked.Balance.Id,
          TargetInventoryStatusCode: work.OriginalInventoryStatusCode,
          Quantity: locked.Balance.QtyOnHand,
          ReasonCode: normalized.ReasonCode,
          ReasonNote: normalized.ReasonNote,
          EvidenceRefs: normalized.EvidenceRefs,
          IdempotencyKey: normalized.IdempotencyKey,
        },
        context,
        manager,
      );
      const updated = await this.UpdateUnlockWorkInTransaction(
        work,
        normalized,
        reason,
        fingerprint,
        context,
        unlock.result.InventoryTransaction.Id,
        manager,
      );
      return { result: { Work: updated.result, Unlock: unlock.result }, entry: [unlock.entry, updated.entry] };
    });
    return {
      CycleCountWork: CycleCountWorkDtoMapper.ToDto(result.Work),
      InventoryControl: result.Unlock,
      IsDuplicate: false,
    };
  }

  private async UpdateUnlockWorkInTransaction(
    work: CycleCountWorkEntity,
    request: UnlockCycleCountWorkDto,
    reason: ReasonDecision,
    fingerprint: string,
    context: AuditContext,
    unlockTransactionId: string | null,
    manager: EntityManager,
  ): Promise<{ result: CycleCountWorkEntity; entry: AuditEntry }> {
    const updated = new CycleCountWorkEntity({
      ...work,
      WorkStatus: CycleCountWorkStatus.Unlocked,
      UnlockTransactionId: unlockTransactionId,
      UnlockIdempotencyKey: request.IdempotencyKey,
      UnlockPayloadFingerprint: fingerprint,
      ReasonCode: request.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: request.ReasonNote,
      EvidenceRefs: request.EvidenceRefs ?? [],
      UpdatedAt: new Date(),
      UpdatedBy: context.ActorUserId,
    });
    const saved = await this.cycleCountWorks.Update(updated, manager);
    return {
      result: saved,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Unlock,
        ObjectType: ObjectType.CycleCount,
        ObjectId: saved.Id,
        ObjectCode: saved.CountCode,
        BeforeJson: CycleCountWorkDtoMapper.ToDto(work) as unknown as Record<string, unknown>,
        AfterJson: CycleCountWorkDtoMapper.ToDto(saved) as unknown as Record<string, unknown>,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: request.ReasonNote ?? request.ReasonCode,
        EvidenceRefs: request.EvidenceRefs ?? [],
        ReferenceType: 'CycleCountUnlock',
        ReferenceId: unlockTransactionId ?? saved.Id,
        WarehouseId: saved.WarehouseId,
        OwnerId: saved.OwnerId,
        ScopeJson: this.Scope(saved),
        Result: AuditResult.Success,
      }),
    };
  }

  private async BuildDuplicateAdjustmentResult(
    work: CycleCountWorkEntity,
    fingerprint: string,
  ): Promise<CycleCountAdjustmentResultDto> {
    this.AssertSameFingerprint(work.AdjustmentPayloadFingerprint, fingerprint);
    if (!work.AdjustmentIdempotencyKey) throw new ConflictException('Cycle count adjustment duplicate is incomplete');
    const transaction = await this.inventoryTransactions.FindTransactionByTypeAndIdempotencyKey(
      InventoryTransactionType.CycleCountAdjustment,
      work.AdjustmentIdempotencyKey,
    );
    if (!transaction) throw new ConflictException('Cycle count adjustment duplicate transaction is missing');
    const movement = await this.inventoryTransactions.FindMovementByTransactionId(transaction.Id);
    if (!movement) throw new ConflictException('Cycle count adjustment duplicate movement is missing');
    const sourceBalance = await this.inventoryBalances.FindById(movement.FromBalanceId);
    const targetBalance = await this.inventoryBalances.FindById(movement.ToBalanceId);
    if (!sourceBalance || !targetBalance)
      throw new ConflictException('Cycle count adjustment duplicate balances missing');
    return {
      CycleCountWork: CycleCountWorkDtoMapper.ToDto(work),
      InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(transaction),
      InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(movement),
      SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(sourceBalance),
      TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(targetBalance),
      OutboxMessageId: transaction.OutboxMessageId,
      EventType: 'AdjustmentPosted',
      IsDuplicate: true,
    };
  }

  private async LoadWork(id: string): Promise<CycleCountWorkEntity> {
    const work = await this.cycleCountWorks.FindById(id?.trim() ?? '');
    if (!work) throw new NotFoundException('Cycle count work not found', { WorkId: id });
    return work;
  }

  private async LoadBalanceContext(balanceId: string): Promise<BalanceContext> {
    if (!balanceId) throw new BusinessRuleException('BalanceId is required');
    const balance = await this.inventoryBalances.FindById(balanceId);
    if (!balance) throw new NotFoundException('Inventory balance not found', { BalanceId: balanceId });
    const dimension = await this.inventoryDimensions.FindById(balance.DimensionId);
    if (!dimension) throw new NotFoundException('Inventory dimension not found', { DimensionId: balance.DimensionId });
    const status = await this.inventoryStatuses.FindById(dimension.InventoryStatusId);
    if (!status) {
      throw new BusinessRuleException('InventoryStatus foundation record is missing', {
        InventoryStatusId: dimension.InventoryStatusId,
      });
    }
    const location = await this.locations.FindById(dimension.LocationId);
    return {
      Balance: balance,
      Dimension: dimension,
      InventoryStatusCode: status.StatusCode,
      LocationCode: location?.LocationCode ?? null,
    };
  }

  private async ResolveCycleCountReason(
    reasonCode: string,
    action: ActionCode,
    evidenceRefs: string[],
  ): Promise<ReasonDecision> {
    if (!reasonCode) throw new BusinessRuleException('ReasonCode is required for cycle count');
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: action,
      ObjectType: ObjectType.CycleCount,
    });
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for this cycle count reason', {
        ReasonCode: reasonCode,
        Action: action,
      });
    }
    if (reason.ApprovalRequired) {
      throw new BusinessRuleException('Approval-required reason is not directly supported by V1-16 cycle count', {
        ReasonCode: reasonCode,
        Action: action,
      });
    }
    return { ReasonCode: reasonCode, ReasonCodeId: reason.ReasonCodeId };
  }

  private async AssertApprovedAdjustment(work: CycleCountWorkEntity, approvalRequestId: string): Promise<void> {
    const approval = await this.approvalRequests.FindById(approvalRequestId);
    if (!approval || approval.Decision !== ApprovalDecision.Approved) {
      throw new BusinessRuleException('Cycle count adjustment approval is not approved', {
        WorkId: work.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
    if (approval.Action !== ActionCode.Adjust || approval.TargetObjectType !== ObjectType.CycleCount) {
      throw new BusinessRuleException('ApprovalRequest does not approve CycleCount Adjust', {
        WorkId: work.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
    if (approval.TargetObjectId !== work.Id) {
      throw new BusinessRuleException('ApprovalRequest target does not match CycleCount work', {
        WorkId: work.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
  }

  private async AssertCycleCountPermission(
    context: AuditContext,
    action: ActionCode,
    scope: { WarehouseId?: string | null; OwnerId?: string | null },
  ): Promise<void> {
    if (!context.ActorUserId) {
      throw new BusinessRuleException('Cycle count mutation requires an authenticated actor');
    }
    if (!this.permissionChecker) return;
    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
      Action: action,
      ObjectType: ObjectType.CycleCount,
      Scope: { WarehouseId: scope.WarehouseId, OwnerId: scope.OwnerId },
    });
    if (!decision.Allowed) {
      throw new BusinessRuleException('Cycle count permission denied', {
        Action: action,
        ObjectType: ObjectType.CycleCount,
      });
    }
  }

  private BuildAdjustmentTransaction(
    transactionId: string,
    movementId: string,
    outboxId: string,
    work: CycleCountWorkEntity,
    locked: BalanceContext,
    idempotencyKey: string,
    reason: ReasonDecision,
    request: PostCycleCountAdjustmentDto,
    now: Date,
    actorUserId: string | null,
  ): InventoryTransactionEntity {
    return new InventoryTransactionEntity({
      Id: transactionId,
      TransactionCode: `ITX-${transactionId.slice(0, 8).toUpperCase()}`,
      TransactionType: InventoryTransactionType.CycleCountAdjustment,
      TransactionStatus: InventoryTransactionStatus.Posted,
      PutawayTaskId: null,
      PutawayTaskCode: null,
      InventoryMovementId: movementId,
      OwnerId: work.OwnerId,
      WarehouseId: work.WarehouseId,
      SkuId: work.SkuId,
      UomId: work.UomId,
      Quantity: Math.abs(work.VarianceQuantity ?? 0),
      FromInventoryStatusCode: locked.InventoryStatusCode,
      ToInventoryStatusCode: locked.InventoryStatusCode,
      FromLocationId: work.LocationId,
      FromLocationCode: work.LocationCode,
      ToLocationId: work.LocationId,
      ToLocationCode: work.LocationCode ?? work.LocationId,
      LpnCode: work.LpnCode,
      IdempotencyKey: idempotencyKey,
      OutboxMessageId: outboxId,
      ReasonCode: reason.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? [],
      PostedAt: now,
      PostedBy: actorUserId,
    });
  }

  private BuildAdjustmentMovement(
    movementId: string,
    transactionId: string,
    work: CycleCountWorkEntity,
    locked: BalanceContext,
    request: PostCycleCountAdjustmentDto,
    fingerprint: string,
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
      OwnerId: work.OwnerId,
      WarehouseId: work.WarehouseId,
      SkuId: work.SkuId,
      UomId: work.UomId,
      Quantity: Math.abs(work.VarianceQuantity ?? 0),
      FromDimensionId: locked.Dimension.Id,
      FromBalanceId: locked.Balance.Id,
      FromLocationId: work.LocationId,
      FromLocationCode: work.LocationCode,
      FromInventoryStatusCode: locked.InventoryStatusCode,
      ToDimensionId: locked.Dimension.Id,
      ToBalanceId: locked.Balance.Id,
      ToLocationId: work.LocationId,
      ToLocationCode: work.LocationCode ?? work.LocationId,
      ToInventoryStatusCode: locked.InventoryStatusCode,
      LpnCode: work.LpnCode,
      ScanEvidenceJson: {
        Operation: 'CycleCountAdjustment',
        EventType: 'AdjustmentPosted',
        CountedQuantity: work.CountedQuantity,
        ExpectedQuantity: work.ExpectedQuantity,
        VarianceQuantity: work.VarianceQuantity,
        ReasonCode: request.ReasonCode,
        ReasonNote: request.ReasonNote ?? null,
        EvidenceRefs: request.EvidenceRefs ?? [],
        CycleCountWorkId: work.Id,
        CycleCountPayloadFingerprint: fingerprint,
      },
      CreatedAt: now,
      CreatedBy: actorUserId,
    });
  }

  private BuildAdjustmentOutbox(
    outboxId: string,
    transaction: InventoryTransactionEntity,
    movement: InventoryMovementEntity,
    work: CycleCountWorkEntity,
    locked: BalanceContext,
    updatedBalance: InventoryBalanceEntity,
  ): OutboxMessageEntity {
    const digest = createHash('sha256').update(transaction.IdempotencyKey).digest('hex').slice(0, 24);
    return new OutboxMessageEntity({
      Id: outboxId,
      MessageId: `AdjustmentPosted:${work.Id}:${digest}`,
      EventType: 'AdjustmentPosted',
      Version: '1.0',
      BusinessReference: work.CountCode,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'INTEGRATION',
      WarehouseContext: work.WarehouseCode ?? work.WarehouseId,
      OwnerContext: work.OwnerCode ?? work.OwnerId,
      EventTime: transaction.PostedAt,
      CorrelationId: transaction.Id,
      CausationId: work.Id,
      Payload: {
        EventType: 'AdjustmentPosted',
        CycleCountWork: CycleCountWorkDtoMapper.ToDto(work),
        InventoryTransaction: InventoryTransactionDtoMapper.TransactionToDto(transaction),
        InventoryMovement: InventoryTransactionDtoMapper.MovementToDto(movement),
        SourceBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(locked.Balance),
        TargetBalance: InventoryTransactionDtoMapper.BalanceToSnapshot(updatedBalance),
        ReasonCode: transaction.ReasonCode,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedBy: transaction.PostedBy,
    });
  }

  private NormalizeCreate(request: CreateCycleCountWorkDto): CreateCycleCountWorkDto {
    const normalized = {
      SourceBalanceId: request.SourceBalanceId?.trim() ?? '',
      Quantity: Number(request.Quantity),
      ToleranceQuantity: Number(request.ToleranceQuantity ?? 0),
      ReasonCode: request.ReasonCode?.trim().toUpperCase() ?? '',
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    this.AssertQuantity(normalized.Quantity, 'Quantity');
    if ((normalized.ToleranceQuantity ?? 0) < 0)
      throw new BusinessRuleException('ToleranceQuantity cannot be negative');
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized;
  }

  private NormalizeSubmit(request: SubmitCycleCountWorkDto): SubmitCycleCountWorkDto {
    const normalized = {
      WorkId: request.WorkId?.trim() ?? '',
      CountedQuantity: Number(request.CountedQuantity),
      ApprovalRequestId: request.ApprovalRequestId?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() ?? '',
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!Number.isFinite(normalized.CountedQuantity) || normalized.CountedQuantity < 0) {
      throw new BusinessRuleException('CountedQuantity cannot be negative');
    }
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized;
  }

  private NormalizeRecount(request: RecountCycleCountWorkDto): RecountCycleCountWorkDto {
    const normalized = {
      WorkId: request.WorkId?.trim() ?? '',
      ReasonCode: request.ReasonCode?.trim().toUpperCase() ?? '',
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized;
  }

  private NormalizeAdjustment(request: PostCycleCountAdjustmentDto): PostCycleCountAdjustmentDto {
    const normalized = {
      WorkId: request.WorkId?.trim() ?? '',
      ApprovalRequestId: request.ApprovalRequestId?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() ?? '',
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized;
  }

  private NormalizeUnlock(request: UnlockCycleCountWorkDto): UnlockCycleCountWorkDto {
    const normalized = {
      WorkId: request.WorkId?.trim() ?? '',
      ReasonCode: request.ReasonCode?.trim().toUpperCase() ?? '',
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    this.AssertIdempotency(normalized.IdempotencyKey);
    return normalized;
  }

  private NormalizeEvidence(evidenceRefs?: string[]): string[] {
    return (evidenceRefs ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private AssertQuantity(value: number, field: string): void {
    if (!Number.isFinite(value) || value <= 0) throw new BusinessRuleException(`${field} must be greater than zero`);
  }

  private ToQuantityScale(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  private AssertIdempotency(idempotencyKey: string): void {
    if (!idempotencyKey) throw new BusinessRuleException('IdempotencyKey is required');
  }

  private AssertWorkStatus(work: CycleCountWorkEntity, allowed: CycleCountWorkStatus[]): void {
    if (!allowed.includes(work.WorkStatus)) {
      throw new BusinessRuleException('Cycle count work status does not allow this operation', {
        WorkId: work.Id,
        WorkStatus: work.WorkStatus,
        Allowed: allowed,
      });
    }
  }

  private AssertSameFingerprint(existing: string | null | undefined, expected: string): void {
    if (existing !== expected)
      throw new ConflictException('Cycle count idempotency key already used for a different payload');
  }

  private BuildAdjustmentFingerprint(request: PostCycleCountAdjustmentDto, work: CycleCountWorkEntity): string {
    return this.Fingerprint('PostCycleCountAdjustment', {
      ...request,
      CountedQuantity: work.CountedQuantity,
      VarianceQuantity: work.VarianceQuantity,
    });
  }

  private Fingerprint(operation: string, payload: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify({ Operation: operation, Payload: payload }))
      .digest('hex');
  }

  private Scope(work: { WarehouseId?: string | null; OwnerId?: string | null }): Record<string, unknown> {
    return { WarehouseId: work.WarehouseId ?? null, OwnerId: work.OwnerId ?? null };
  }
}
