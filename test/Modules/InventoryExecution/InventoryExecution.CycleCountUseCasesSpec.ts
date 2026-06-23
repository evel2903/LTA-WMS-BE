import { EntityManager } from 'typeorm';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ICycleCountWorkRepository } from '@modules/InventoryExecution/Application/Interfaces/ICycleCountWorkRepository';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { CycleCountWorkLifecycleService } from '@modules/InventoryExecution/Application/Services/CycleCountWorkLifecycleService';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { CycleCountWorkEntity } from '@modules/InventoryExecution/Domain/Entities/CycleCountWorkEntity';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { CycleCountWorkStatus } from '@modules/InventoryExecution/Domain/Enums/CycleCountWorkStatus';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import {
  MakeInventoryBalance,
  MakeInventoryDimension,
  MakeInventoryStatus,
  MakeLocation,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
  MemoryLocationRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';

const now = new Date('2026-06-23T06:00:00.000Z');
const contextFor = (actor: string): AuditContext => ({ ...SystemAuditContext, ActorUserId: actor });

class MemoryCycleCountWorkRepository implements ICycleCountWorkRepository {
  public readonly works = new Map<string, CycleCountWorkEntity>();

  public async Create(work: CycleCountWorkEntity): Promise<CycleCountWorkEntity> {
    this.works.set(work.Id, work);
    return work;
  }

  public async Update(work: CycleCountWorkEntity): Promise<CycleCountWorkEntity> {
    this.works.set(work.Id, work);
    return work;
  }

  public async FindById(id: string): Promise<CycleCountWorkEntity | null> {
    return this.works.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<CycleCountWorkEntity | null> {
    return this.FindById(id);
  }

  public async FindByCreateIdempotencyKey(idempotencyKey: string): Promise<CycleCountWorkEntity | null> {
    return [...this.works.values()].find((work) => work.CreateIdempotencyKey === idempotencyKey) ?? null;
  }

  public async List(skip: number, take: number): Promise<{ Items: CycleCountWorkEntity[]; TotalItems: number }> {
    const items = [...this.works.values()].slice(skip, skip + take);
    return { Items: items, TotalItems: this.works.size };
  }
}

class MemoryInventoryTransactionRepository implements IInventoryTransactionRepository {
  public transactions: InventoryTransactionEntity[] = [];
  public movements: InventoryMovementEntity[] = [];

  public async CreateTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    this.transactions.push(transaction);
    return transaction;
  }

  public async CreateMovement(movement: InventoryMovementEntity): Promise<InventoryMovementEntity> {
    this.movements.push(movement);
    return movement;
  }

  public async SaveTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    const index = this.transactions.findIndex((item) => item.Id === transaction.Id);
    if (index >= 0) this.transactions[index] = transaction;
    else this.transactions.push(transaction);
    return transaction;
  }

  public async FindTransactionByIdempotencyKey(
    putawayTaskId: string,
    idempotencyKey: string,
  ): Promise<InventoryTransactionEntity | null> {
    return (
      this.transactions.find(
        (transaction) => transaction.PutawayTaskId === putawayTaskId && transaction.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async FindTransactionByTypeAndIdempotencyKey(
    transactionType: InventoryTransactionType,
    idempotencyKey: string,
  ): Promise<InventoryTransactionEntity | null> {
    return (
      this.transactions.find(
        (transaction) =>
          transaction.PutawayTaskId === null &&
          transaction.TransactionType === transactionType &&
          transaction.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async FindMovementByTransactionId(transactionId: string): Promise<InventoryMovementEntity | null> {
    return this.movements.find((movement) => movement.InventoryTransactionId === transactionId) ?? null;
  }
}

class FakeIntegrationRepository {
  public outboxMessages: OutboxMessageEntity[] = [];

  public async CreateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.outboxMessages.push(outboxMessage);
    return outboxMessage;
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  public calls: Array<{ ReasonCode: string; Action: ActionCode; ObjectType: ObjectType }> = [];

  public async ValidateReason(input: {
    ReasonCode: string;
    Action: ActionCode;
    ObjectType: ObjectType;
  }): Promise<{ ReasonCodeId: string; EvidenceRequired: boolean; ApprovalRequired: boolean }> {
    this.calls.push(input);
    return {
      ReasonCodeId: `reason-${input.ReasonCode}`,
      EvidenceRequired: input.ReasonCode === 'RC-V1-ADJUSTMENT',
      ApprovalRequired: false,
    };
  }
}

class FakePermissionChecker implements IPermissionChecker {
  public calls: Array<{ Action: ActionCode; ObjectType: ObjectType }> = [];

  public async Check(context: { Action: ActionCode; ObjectType: ObjectType }): Promise<PermissionDecision> {
    this.calls.push({ Action: context.Action, ObjectType: context.ObjectType });
    return { Allowed: true };
  }
}

class FakeAuditedTransaction {
  public entries: AuditEntry[] = [];

  public async Run<T>(
    work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry | AuditEntry[] }>,
  ): Promise<T> {
    const { result, entry } = await work({} as EntityManager);
    this.entries.push(...(Array.isArray(entry) ? entry : [entry]));
    return result;
  }
}

class MemoryApprovalRequestRepository implements IApprovalRequestRepository {
  public readonly requests = new Map<string, ApprovalRequestEntity>();

  public async FindById(id: string): Promise<ApprovalRequestEntity | null> {
    return this.requests.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<ApprovalRequestEntity | null> {
    return this.FindById(id);
  }

  public async Create(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.requests.set(request.Id, request);
    return request;
  }

  public async Update(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.requests.set(request.Id, request);
    return request;
  }

  public async List(): Promise<{ Items: ApprovalRequestEntity[]; TotalItems: number }> {
    const items = [...this.requests.values()];
    return { Items: items, TotalItems: items.length };
  }
}

function buildHarness() {
  const dimensionKeyService = new InventoryDimensionKeyService();
  const statuses = [
    MakeInventoryStatus({ Id: 'status-available', StatusCode: 'AVAILABLE', AllowsAllocation: true, AllowsPick: true }),
    MakeInventoryStatus({
      Id: 'status-counting',
      StatusCode: 'COUNTING_LOCKED',
      AllowsAllocation: false,
      AllowsPick: false,
    }),
  ];
  const sourceHash = dimensionKeyService.BuildHash({
    OwnerId: 'owner-active',
    SkuId: 'sku-active',
    WarehouseId: 'warehouse-active',
    LocationId: 'loc-source',
    InventoryStatusId: 'status-available',
    UomId: 'uom-ea',
    LpnCode: 'LPN-CC-001',
    LotNumber: null,
    ExpiryDate: null,
    SerialNumber: null,
    ProductionDate: null,
    CountryOfOrigin: null,
    CustomsStatus: null,
  });
  const sourceDimension = MakeInventoryDimension({
    Id: 'dimension-source',
    OwnerId: 'owner-active',
    SkuId: 'sku-active',
    WarehouseId: 'warehouse-active',
    LocationId: 'loc-source',
    InventoryStatusId: 'status-available',
    DimensionKeyHash: sourceHash,
    UomId: 'uom-ea',
    LpnCode: 'LPN-CC-001',
  });
  const balances = new MemoryInventoryBalanceRepository();
  balances.balances.set(
    'balance-source',
    MakeInventoryBalance({
      Id: 'balance-source',
      DimensionId: sourceDimension.Id,
      QtyOnHand: 10,
      QtyReserved: 0,
    }),
  );
  const dimensions = new MemoryInventoryDimensionRepository();
  dimensions.dimensions.set(sourceDimension.Id, sourceDimension);
  const inventoryStatuses = new MemoryInventoryStatusRepository(statuses);
  const locations = new MemoryLocationRepository([
    MakeLocation({ Id: 'loc-source', LocationCode: 'A-01', WarehouseId: 'warehouse-active' }),
    MakeLocation({ Id: 'loc-target', LocationCode: 'B-01', WarehouseId: 'warehouse-active' }),
  ]);
  const cycleCountWorks = new MemoryCycleCountWorkRepository();
  const inventoryTransactions = new MemoryInventoryTransactionRepository();
  const integrations = new FakeIntegrationRepository();
  const reasonCatalog = new FakeReasonCatalog();
  const audited = new FakeAuditedTransaction();
  const permission = new FakePermissionChecker();
  const approvals = new MemoryApprovalRequestRepository();
  const inventoryControl = new InventoryControlUseCase(
    inventoryTransactions,
    inventoryStatuses,
    dimensions,
    balances,
    locations,
    integrations as unknown as IIntegrationRepository,
    dimensionKeyService,
    reasonCatalog,
    audited as unknown as AuditedTransaction,
    permission,
  );
  const cycleCount = new CycleCountWorkLifecycleService(
    cycleCountWorks,
    inventoryControl,
    inventoryTransactions,
    approvals,
    balances,
    dimensions,
    inventoryStatuses,
    locations,
    integrations as unknown as IIntegrationRepository,
    reasonCatalog,
    audited as unknown as AuditedTransaction,
    permission,
  );

  return {
    cycleCount,
    inventoryControl,
    balances,
    inventoryTransactions,
    integrations,
    audited,
    approvals,
    permission,
  };
}

function approvedCycleCountAdjustment(workId: string): ApprovalRequestEntity {
  return new ApprovalRequestEntity({
    Id: 'approval-cycle-count-1',
    RequesterUserId: 'operator-1',
    Action: ActionCode.Adjust,
    TargetObjectType: ObjectType.CycleCount,
    TargetObjectId: workId,
    TargetObjectCode: 'CC-001',
    Decision: ApprovalDecision.Approved,
    CreatedAt: now,
    UpdatedAt: now,
  });
}

describe('InventoryExecution cycle count use cases', () => {
  it('locks stock, blocks move from COUNTING_LOCKED, posts approved adjustment once and unlocks', async () => {
    const { cycleCount, inventoryControl, balances, inventoryTransactions, integrations, approvals, permission } =
      buildHarness();
    const context = contextFor('operator-1');

    const created = await cycleCount.Create(
      {
        SourceBalanceId: 'balance-source',
        Quantity: 4,
        ToleranceQuantity: 1,
        ReasonCode: 'RC-V1-HOLD-RELEASE',
        ReasonNote: 'Khóa kiểm kê',
        IdempotencyKey: 'cc-lock-1',
      },
      context,
    );

    expect(created.CycleCountWork.WorkStatus).toBe(CycleCountWorkStatus.CountingLocked);
    expect(created.CycleCountWork.LockedBalanceId).toBeTruthy();
    expect(created.InventoryControl?.EventType).toBe('InventoryStatusChanged');
    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(6);

    await expect(
      inventoryControl.MoveInternal(
        {
          SourceBalanceId: created.CycleCountWork.LockedBalanceId ?? '',
          TargetLocationId: 'loc-target',
          Quantity: 1,
          ReasonCode: 'RC-V1-ADJUSTMENT',
          EvidenceRefs: ['move://locked'],
          IdempotencyKey: 'move-locked-1',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const submitted = await cycleCount.Submit(
      {
        WorkId: created.CycleCountWork.Id,
        CountedQuantity: 2,
        ReasonCode: 'RC-V1-HOLD-RELEASE',
        IdempotencyKey: 'cc-submit-1',
      },
      context,
    );
    expect(submitted.CycleCountWork.WorkStatus).toBe(CycleCountWorkStatus.PendingReview);
    expect(submitted.CycleCountWork.VarianceQuantity).toBe(-2);

    await expect(
      cycleCount.Submit(
        {
          WorkId: created.CycleCountWork.Id,
          CountedQuantity: 4,
          ReasonCode: 'RC-V1-HOLD-RELEASE',
          IdempotencyKey: 'cc-submit-bypass',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      cycleCount.PostAdjustment(
        {
          WorkId: created.CycleCountWork.Id,
          ReasonCode: 'RC-V1-ADJUSTMENT',
          EvidenceRefs: ['cc://sheet-1'],
          IdempotencyKey: 'cc-adjust-1',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await approvals.Create(approvedCycleCountAdjustment(created.CycleCountWork.Id));
    const adjusted = await cycleCount.PostAdjustment(
      {
        WorkId: created.CycleCountWork.Id,
        ApprovalRequestId: 'approval-cycle-count-1',
        ReasonCode: 'RC-V1-ADJUSTMENT',
        ReasonNote: 'Điều chỉnh sau kiểm kê',
        EvidenceRefs: ['cc://approval-1'],
        IdempotencyKey: 'cc-adjust-1',
      },
      context,
    );

    expect(adjusted.EventType).toBe('AdjustmentPosted');
    expect(adjusted.CycleCountWork.WorkStatus).toBe(CycleCountWorkStatus.AdjustmentPosted);
    expect(adjusted.InventoryTransaction.TransactionType).toBe(InventoryTransactionType.CycleCountAdjustment);
    expect(adjusted.TargetBalance.QtyOnHand).toBe(2);
    expect(integrations.outboxMessages.map((message) => message.EventType)).toContain('AdjustmentPosted');
    const adjustmentOutbox = integrations.outboxMessages.find((message) => message.EventType === 'AdjustmentPosted');
    expect(adjustmentOutbox?.Payload).toMatchObject({
      CycleCountWork: {
        WorkStatus: CycleCountWorkStatus.AdjustmentPosted,
        AdjustmentTransactionId: adjusted.InventoryTransaction.Id,
      },
    });

    const transactionCountAfterAdjustment = inventoryTransactions.transactions.length;
    const duplicate = await cycleCount.PostAdjustment(
      {
        WorkId: created.CycleCountWork.Id,
        ApprovalRequestId: 'approval-cycle-count-1',
        ReasonCode: 'RC-V1-ADJUSTMENT',
        ReasonNote: 'Điều chỉnh sau kiểm kê',
        EvidenceRefs: ['cc://approval-1'],
        IdempotencyKey: 'cc-adjust-1',
      },
      context,
    );
    expect(duplicate.IsDuplicate).toBe(true);
    expect(inventoryTransactions.transactions).toHaveLength(transactionCountAfterAdjustment);

    await expect(
      cycleCount.PostAdjustment(
        {
          WorkId: created.CycleCountWork.Id,
          ApprovalRequestId: 'approval-cycle-count-1',
          ReasonCode: 'RC-V1-ADJUSTMENT',
          ReasonNote: 'payload khác',
          EvidenceRefs: ['cc://approval-1'],
          IdempotencyKey: 'cc-adjust-1',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      cycleCount.PostAdjustment(
        {
          WorkId: created.CycleCountWork.Id,
          ApprovalRequestId: 'approval-cycle-count-1',
          ReasonCode: 'RC-V1-ADJUSTMENT',
          EvidenceRefs: ['cc://approval-2'],
          IdempotencyKey: 'cc-adjust-2',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const unlocked = await cycleCount.Unlock(
      {
        WorkId: created.CycleCountWork.Id,
        ReasonCode: 'RC-V1-HOLD-RELEASE',
        ReasonNote: 'Mở khóa sau kiểm kê',
        IdempotencyKey: 'cc-unlock-1',
      },
      context,
    );

    expect(unlocked.CycleCountWork.WorkStatus).toBe(CycleCountWorkStatus.Unlocked);
    expect(unlocked.InventoryControl?.InventoryTransaction.ToInventoryStatusCode).toBe('AVAILABLE');
    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(8);
    expect(permission.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.CycleCount }),
        expect.objectContaining({ Action: ActionCode.Update, ObjectType: ObjectType.CycleCount }),
        expect.objectContaining({ Action: ActionCode.Adjust, ObjectType: ObjectType.CycleCount }),
        expect.objectContaining({ Action: ActionCode.Unlock, ObjectType: ObjectType.CycleCount }),
      ]),
    );
  });

  it('rejects missing reason without changing inventory balance and requires list scope', async () => {
    const { cycleCount, balances } = buildHarness();

    await expect(
      cycleCount.Create(
        {
          SourceBalanceId: 'balance-source',
          Quantity: 4,
          ReasonCode: '',
          IdempotencyKey: 'cc-lock-missing-reason',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(10);
    await expect(cycleCount.List({})).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('does not mark zero-count work unlocked without a releasable locked quantity', async () => {
    const { cycleCount, balances, approvals } = buildHarness();
    const context = contextFor('operator-1');

    const created = await cycleCount.Create(
      {
        SourceBalanceId: 'balance-source',
        Quantity: 4,
        ToleranceQuantity: 0,
        ReasonCode: 'RC-V1-HOLD-RELEASE',
        IdempotencyKey: 'cc-zero-lock',
      },
      context,
    );
    const submitted = await cycleCount.Submit(
      {
        WorkId: created.CycleCountWork.Id,
        CountedQuantity: 0,
        ReasonCode: 'RC-V1-HOLD-RELEASE',
        IdempotencyKey: 'cc-zero-submit',
      },
      context,
    );
    expect(submitted.CycleCountWork.WorkStatus).toBe(CycleCountWorkStatus.PendingReview);

    await approvals.Create(approvedCycleCountAdjustment(created.CycleCountWork.Id));
    const adjusted = await cycleCount.PostAdjustment(
      {
        WorkId: created.CycleCountWork.Id,
        ApprovalRequestId: 'approval-cycle-count-1',
        ReasonCode: 'RC-V1-ADJUSTMENT',
        EvidenceRefs: ['cc://zero-approval'],
        IdempotencyKey: 'cc-zero-adjust',
      },
      context,
    );
    expect(adjusted.TargetBalance.QtyOnHand).toBe(0);

    await expect(
      cycleCount.Unlock(
        {
          WorkId: created.CycleCountWork.Id,
          ReasonCode: 'RC-V1-HOLD-RELEASE',
          IdempotencyKey: 'cc-zero-unlock',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(balances.balances.get(adjusted.TargetBalance.BalanceId)?.QtyOnHand).toBe(0);
  });
});
