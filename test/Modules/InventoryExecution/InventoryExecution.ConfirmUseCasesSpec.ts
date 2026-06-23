import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { ConfirmPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ConfirmPutawayTaskUseCase';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import {
  MakeInventoryBalance,
  MakeInventoryDimension,
  MakeInventoryStatus,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { EntityManager } from 'typeorm';

const now = new Date('2026-06-23T04:00:00.000Z');
const contextFor = (actor: string): AuditContext => ({ ...SystemAuditContext, ActorUserId: actor });

const makeTask = (overrides: Partial<ConstructorParameters<typeof PutawayTaskEntity>[0]> = {}) =>
  new PutawayTaskEntity({
    Id: 'putaway-task-1',
    TaskCode: 'PUT-0001',
    TaskStatus: PutawayTaskStatus.Released,
    InboundPutawayReleaseId: 'release-1',
    ReceiptId: 'receipt-1',
    ReceiptLineId: 'receipt-line-1',
    InboundPlanId: 'plan-1',
    InboundPlanLineId: 'plan-line-1',
    InboundLpnId: 'lpn-1',
    OwnerId: 'owner-active',
    OwnerCode: 'OWNER-A',
    WarehouseId: 'warehouse-active',
    WarehouseCode: 'WH-A',
    SkuId: 'sku-active',
    SkuCode: 'SKU-A',
    UomId: 'uom-ea',
    UomCode: 'EA',
    Quantity: 5,
    LpnCode: 'LPN-001',
    SsccCode: '000000000000000001',
    InventoryStatusCode: 'READY_FOR_PUTAWAY',
    SourceLocationId: 'loc-source',
    SourceLocationCode: 'RCV-STG-01',
    TargetLocationId: 'loc-target',
    TargetLocationCode: 'A-01',
    TargetLocationProfileId: 'profile-storage',
    Priority: 50,
    MobileTaskId: 'mobile-task-1',
    IdempotencyKey: 'release-key-1',
    ReleasedAt: now,
    ReleasedBy: 'operator-1',
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });

class MemoryPutawayTaskRepository implements IPutawayTaskRepository {
  public tasks: PutawayTaskEntity[];

  constructor(tasks: PutawayTaskEntity[] = [makeTask()]) {
    this.tasks = tasks;
  }

  public async Create(task: PutawayTaskEntity): Promise<PutawayTaskEntity> {
    this.tasks.push(task);
    return task;
  }

  public async FindById(id: string): Promise<PutawayTaskEntity | null> {
    return this.tasks.find((task) => task.Id === id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<PutawayTaskEntity | null> {
    return this.FindById(id);
  }

  public async FindByInboundPutawayReleaseId(inboundPutawayReleaseId: string): Promise<PutawayTaskEntity | null> {
    return this.tasks.find((task) => task.InboundPutawayReleaseId === inboundPutawayReleaseId) ?? null;
  }

  public async FindByIdempotencyKey(
    inboundPutawayReleaseId: string,
    idempotencyKey: string,
  ): Promise<PutawayTaskEntity | null> {
    return (
      this.tasks.find(
        (task) => task.InboundPutawayReleaseId === inboundPutawayReleaseId && task.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async Save(task: PutawayTaskEntity): Promise<PutawayTaskEntity> {
    const index = this.tasks.findIndex((item) => item.Id === task.Id);
    if (index >= 0) {
      this.tasks[index] = task;
    } else {
      this.tasks.push(task);
    }
    return task;
  }

  public async List(
    skip: number,
    take: number,
    filter: Parameters<IPutawayTaskRepository['List']>[2] = {},
  ): Promise<{ Items: PutawayTaskEntity[]; TotalItems: number }> {
    let items = this.tasks;
    if (filter?.WarehouseId) items = items.filter((task) => task.WarehouseId === filter.WarehouseId);
    if (filter?.OwnerId) items = items.filter((task) => task.OwnerId === filter.OwnerId);
    if (filter?.TaskStatus) items = items.filter((task) => task.TaskStatus === filter.TaskStatus);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
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
    if (index >= 0) {
      this.transactions[index] = transaction;
    } else {
      this.transactions.push(transaction);
    }
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

class FakeTaskExecutionRepository implements ITaskExecutionRepository {
  public tasks = new Map<string, MobileTaskEntity>();
  public scanEvents: MobileScanEventEntity[] = [];

  constructor(tasks: MobileTaskEntity[] = [makeMobileTask()]) {
    tasks.forEach((task) => this.tasks.set(task.Id, task));
  }

  public async FindCandidates(): Promise<MobileTaskEntity[]> {
    return [...this.tasks.values()];
  }

  public async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.tasks.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    return this.FindById(id);
  }

  public async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    this.tasks.set(task.Id, task);
    return task;
  }

  public async SaveScanEvent(scan: MobileScanEventEntity): Promise<MobileScanEventEntity> {
    this.scanEvents.push(scan);
    return scan;
  }

  public async RunInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work({} as EntityManager);
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
    return { ReasonCodeId: 'reason-putaway-confirm', EvidenceRequired: false, ApprovalRequired: false };
  }
}

class FakePermissionChecker implements IPermissionChecker {
  public calls: Array<{ Action: ActionCode; ObjectType: ObjectType; WarehouseId?: string | null }> = [];

  public async Check(context: {
    Action: ActionCode;
    ObjectType: ObjectType;
    Scope?: { WarehouseId?: string | null };
  }): Promise<PermissionDecision> {
    this.calls.push({
      Action: context.Action,
      ObjectType: context.ObjectType,
      WarehouseId: context.Scope?.WarehouseId,
    });
    return { Allowed: true };
  }
}

class FakeAuditedTransaction {
  public entries: AuditEntry[] = [];

  public async Run<T>(work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    const { result, entry } = await work({} as EntityManager);
    this.entries.push(entry);
    return result;
  }
}

function makeMobileTask() {
  return new MobileTaskEntity({
    Id: 'mobile-task-1',
    TaskCode: 'MT-PUT-0001',
    TaskType: MobileTaskType.Putaway,
    TaskStatus: MobileTaskStatus.InProgress,
    WarehouseId: 'warehouse-active',
    WarehouseCode: 'WH-A',
    OwnerId: 'owner-active',
    OwnerCode: 'OWNER-A',
    SourceDocumentType: 'PutawayTask',
    SourceDocumentId: 'putaway-task-1',
    SourceDocumentCode: 'PUT-0001',
    Priority: 50,
    TaskPayload: {},
    CreatedAt: now,
    UpdatedAt: now,
  });
}

function buildHarness(input?: { task?: PutawayTaskEntity; sourceQty?: number; sourceReserved?: number }) {
  const task = input?.task ?? makeTask();
  const dimensionKeyService = new InventoryDimensionKeyService();
  const readyStatus = MakeInventoryStatus({
    Id: 'status-ready',
    StatusCode: 'READY_FOR_PUTAWAY',
    DisplayName: 'Ready for Putaway',
    AllowsAllocation: false,
    AllowsPick: false,
  });
  const availableStatus = MakeInventoryStatus({
    Id: 'status-available',
    StatusCode: 'AVAILABLE',
    DisplayName: 'Available',
    AllowsAllocation: true,
    AllowsPick: true,
  });
  const sourceHash = dimensionKeyService.BuildHash({
    OwnerId: task.OwnerId,
    SkuId: task.SkuId,
    WarehouseId: task.WarehouseId,
    LocationId: task.SourceLocationId ?? '',
    InventoryStatusId: readyStatus.Id,
    UomId: task.UomId,
    LpnCode: task.LpnCode,
  });
  const sourceDimension = MakeInventoryDimension({
    Id: 'dimension-source',
    OwnerId: task.OwnerId,
    SkuId: task.SkuId,
    WarehouseId: task.WarehouseId,
    LocationId: task.SourceLocationId ?? 'loc-source',
    InventoryStatusId: readyStatus.Id,
    UomId: task.UomId,
    LpnCode: task.LpnCode,
    DimensionKeyHash: sourceHash,
  });
  const balances = new MemoryInventoryBalanceRepository();
  balances.balances.set(
    'balance-source',
    MakeInventoryBalance({
      Id: 'balance-source',
      DimensionId: sourceDimension.Id,
      QtyOnHand: input?.sourceQty ?? 5,
      QtyReserved: input?.sourceReserved ?? 0,
    }),
  );
  const dimensions = new MemoryInventoryDimensionRepository();
  dimensions.dimensions.set(sourceDimension.Id, sourceDimension);
  const putawayTasks = new MemoryPutawayTaskRepository([task]);
  const inventoryTransactions = new MemoryInventoryTransactionRepository();
  const integrations = new FakeIntegrationRepository();
  const taskExecution = new FakeTaskExecutionRepository();
  const reasonCatalog = new FakeReasonCatalog();
  const audited = new FakeAuditedTransaction();
  const permission = new FakePermissionChecker();
  const useCase = new ConfirmPutawayTaskUseCase(
    putawayTasks,
    inventoryTransactions,
    new MemoryInventoryStatusRepository([readyStatus, availableStatus]) as IInventoryStatusRepository,
    dimensions as IInventoryDimensionRepository,
    balances as IInventoryBalanceRepository,
    integrations as unknown as IIntegrationRepository,
    taskExecution,
    dimensionKeyService,
    reasonCatalog,
    audited as unknown as AuditedTransaction,
    permission,
  );

  return {
    useCase,
    task,
    putawayTasks,
    inventoryTransactions,
    balances,
    dimensions,
    integrations,
    taskExecution,
    reasonCatalog,
    audited,
    permission,
  };
}

describe('InventoryExecution putaway confirm use case', () => {
  it('posts inventory transaction and movement, updates balances and completes mobile scan task', async () => {
    const { useCase, putawayTasks, inventoryTransactions, balances, integrations, taskExecution, audited, permission } =
      buildHarness();

    const result = await useCase.Execute(
      'putaway-task-1',
      {
        SourceLocationScan: 'rcv-stg-01',
        TargetLocationScan: 'a-01',
        LpnScan: 'lpn-001',
        ConfirmedQuantity: 5,
        ReasonCode: 'PUTAWAY_CONFIRM',
        ReasonNote: 'Target location scan accepted',
        EvidenceRefs: ['photo://putaway-1'],
        DeviceCode: 'RF-01',
        SessionId: 'session-1',
        IdempotencyKey: ' confirm-key-1 ',
      },
      contextFor('operator-1'),
    );

    expect(result.IsDuplicate).toBe(false);
    expect(result.PutawayTask.TaskStatus).toBe(PutawayTaskStatus.Confirmed);
    expect(result.InventoryTransaction.TransactionType).toBe(InventoryTransactionType.PutawayConfirm);
    expect(result.InventoryTransaction.IdempotencyKey).toBe('confirm-key-1');
    expect(result.InventoryTransaction.FromInventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(result.InventoryTransaction.ToInventoryStatusCode).toBe('AVAILABLE');
    expect(result.InventoryMovement.ScanEvidenceJson).toMatchObject({
      StorageMilestone: 'Stored',
      ConfirmPayloadFingerprint: expect.any(String),
    });
    expect(result.SourceBalance.QtyOnHand).toBe(0);
    expect(result.TargetBalance.QtyOnHand).toBe(5);
    expect(putawayTasks.tasks[0].TaskStatus).toBe(PutawayTaskStatus.Confirmed);
    expect(inventoryTransactions.transactions).toHaveLength(1);
    expect(inventoryTransactions.movements).toHaveLength(1);
    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(0);
    expect(integrations.outboxMessages[0]).toMatchObject({
      EventType: 'PutawayConfirmed',
      Payload: expect.objectContaining({
        InventoryTransaction: expect.objectContaining({ ToInventoryStatusCode: 'AVAILABLE' }),
      }),
    });
    expect(integrations.outboxMessages[0].MessageId.length).toBeLessThanOrEqual(120);
    expect(taskExecution.tasks.get('mobile-task-1')?.TaskStatus).toBe(MobileTaskStatus.Completed);
    expect(taskExecution.scanEvents).toHaveLength(3);
    expect(taskExecution.scanEvents.every((scan) => scan.Result === MobileScanResult.Accepted)).toBe(true);
    expect(taskExecution.scanEvents.find((scan) => scan.ScanType === MobileScanType.Lpn)).toMatchObject({
      ResolvedObjectId: 'lpn-1',
    });
    expect(permission.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Action: ActionCode.Update, ObjectType: ObjectType.PutawayTask }),
        expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.InventoryMovement }),
      ]),
    );
    expect(audited.entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Success,
      ReasonCodeId: 'reason-putaway-confirm',
    });
  });

  it('rejects mismatched target scan and writes failed audit without inventory mutation', async () => {
    const { useCase, inventoryTransactions, balances, integrations, taskExecution, audited } = buildHarness();

    await expect(
      useCase.Execute(
        'putaway-task-1',
        {
          SourceLocationScan: 'RCV-STG-01',
          TargetLocationScan: 'WRONG-LOC',
          LpnScan: 'LPN-001',
          IdempotencyKey: 'confirm-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(inventoryTransactions.transactions).toHaveLength(0);
    expect(integrations.outboxMessages).toHaveLength(0);
    expect(taskExecution.scanEvents).toHaveLength(0);
    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(5);
    expect(audited.entries[0]).toMatchObject({
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Failed,
      AfterJson: expect.objectContaining({ Decision: 'Blocked' }),
    });
  });

  it('returns duplicate confirm result without posting a second transaction', async () => {
    const { useCase, inventoryTransactions, integrations } = buildHarness();
    const request = {
      SourceLocationScan: 'RCV-STG-01',
      TargetLocationScan: 'A-01',
      LpnScan: 'LPN-001',
      ConfirmedQuantity: 5,
      IdempotencyKey: 'confirm-key-1',
    };

    const first = await useCase.Execute('putaway-task-1', request, contextFor('operator-1'));
    const second = await useCase.Execute('putaway-task-1', request, contextFor('operator-1'));

    expect(first.IsDuplicate).toBe(false);
    expect(second.IsDuplicate).toBe(true);
    expect(inventoryTransactions.transactions).toHaveLength(1);
    expect(inventoryTransactions.movements).toHaveLength(1);
    expect(integrations.outboxMessages).toHaveLength(1);
  });

  it('returns duplicate confirm result when retry reaches the post-lock idempotency check', async () => {
    const { useCase, putawayTasks, inventoryTransactions, integrations } = buildHarness();
    const request = {
      SourceLocationScan: 'RCV-STG-01',
      TargetLocationScan: 'A-01',
      LpnScan: 'LPN-001',
      ConfirmedQuantity: 5,
      IdempotencyKey: 'confirm-key-1',
    };
    await useCase.Execute('putaway-task-1', request, contextFor('operator-1'));

    const originalLookup = inventoryTransactions.FindTransactionByIdempotencyKey.bind(inventoryTransactions);
    let lookupCount = 0;
    inventoryTransactions.FindTransactionByIdempotencyKey = jest.fn(async (...args) => {
      lookupCount += 1;
      if (lookupCount === 1) return null;
      return originalLookup(...args);
    });
    putawayTasks.tasks[0].TaskStatus = PutawayTaskStatus.Released;

    const retry = await useCase.Execute('putaway-task-1', request, contextFor('operator-1'));

    expect(retry.IsDuplicate).toBe(true);
    expect(inventoryTransactions.transactions).toHaveLength(1);
    expect(integrations.outboxMessages).toHaveLength(1);
  });

  it('rejects reused idempotency key when payload changes', async () => {
    const { useCase } = buildHarness();
    await useCase.Execute(
      'putaway-task-1',
      {
        SourceLocationScan: 'RCV-STG-01',
        TargetLocationScan: 'A-01',
        LpnScan: 'LPN-001',
        ConfirmedQuantity: 5,
        IdempotencyKey: 'confirm-key-1',
      },
      contextFor('operator-1'),
    );

    await expect(
      useCase.Execute(
        'putaway-task-1',
        {
          SourceLocationScan: 'RCV-STG-01',
          TargetLocationScan: 'A-02',
          LpnScan: 'LPN-001',
          ConfirmedQuantity: 5,
          IdempotencyKey: 'confirm-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects reused idempotency key when reason, evidence, device or session changes', async () => {
    const { useCase } = buildHarness();
    await useCase.Execute(
      'putaway-task-1',
      {
        SourceLocationScan: 'RCV-STG-01',
        TargetLocationScan: 'A-01',
        LpnScan: 'LPN-001',
        ConfirmedQuantity: 5,
        ReasonCode: 'PUTAWAY_CONFIRM',
        ReasonNote: 'first payload',
        EvidenceRefs: ['photo://first'],
        DeviceCode: 'RF-01',
        SessionId: 'session-1',
        IdempotencyKey: 'confirm-key-1',
      },
      contextFor('operator-1'),
    );

    await expect(
      useCase.Execute(
        'putaway-task-1',
        {
          SourceLocationScan: 'RCV-STG-01',
          TargetLocationScan: 'A-01',
          LpnScan: 'LPN-001',
          ConfirmedQuantity: 5,
          ReasonCode: 'PUTAWAY_CONFIRM',
          ReasonNote: 'changed payload',
          EvidenceRefs: ['photo://changed'],
          DeviceCode: 'RF-02',
          SessionId: 'session-2',
          IdempotencyKey: 'confirm-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses matched SSCC as LPN scan evidence when SSCC alias is scanned', async () => {
    const task = makeTask({ LpnCode: 'LPN-001', SsccCode: '000000000000000001' });
    const { useCase } = buildHarness({ task });

    const result = await useCase.Execute(
      'putaway-task-1',
      {
        SourceLocationScan: 'RCV-STG-01',
        TargetLocationScan: 'A-01',
        LpnScan: '000000000000000001',
        ConfirmedQuantity: 5,
        IdempotencyKey: 'confirm-key-1',
      },
      contextFor('operator-1'),
    );

    expect(result.ScanResults.find((scan) => scan.ScanType === 'Lpn')).toMatchObject({
      RawValue: '000000000000000001',
      ExpectedValue: '000000000000000001',
      Result: MobileScanResult.Accepted,
    });
  });

  it('keeps outbox message id within schema length for long idempotency keys', async () => {
    const { useCase, integrations } = buildHarness();
    await useCase.Execute(
      'putaway-task-1',
      {
        SourceLocationScan: 'RCV-STG-01',
        TargetLocationScan: 'A-01',
        LpnScan: 'LPN-001',
        ConfirmedQuantity: 5,
        IdempotencyKey: 'x'.repeat(160),
      },
      contextFor('operator-1'),
    );

    expect(integrations.outboxMessages[0].MessageId.length).toBeLessThanOrEqual(120);
  });

  it('blocks confirmation that would make source inventory balance negative', async () => {
    const { useCase, inventoryTransactions, balances, integrations, audited } = buildHarness({ sourceQty: 4 });

    await expect(
      useCase.Execute(
        'putaway-task-1',
        {
          SourceLocationScan: 'RCV-STG-01',
          TargetLocationScan: 'A-01',
          LpnScan: 'LPN-001',
          ConfirmedQuantity: 5,
          IdempotencyKey: 'confirm-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(inventoryTransactions.transactions).toHaveLength(0);
    expect(integrations.outboxMessages).toHaveLength(0);
    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(4);
    expect(audited.entries[0]).toMatchObject({
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Failed,
      AfterJson: expect.objectContaining({
        Reason: 'Putaway confirmation would create negative source balance',
      }),
    });
  });

  it('blocks confirmation that would make source available quantity negative', async () => {
    const { useCase, inventoryTransactions, balances, integrations, audited } = buildHarness({
      sourceQty: 5,
      sourceReserved: 1,
    });

    await expect(
      useCase.Execute(
        'putaway-task-1',
        {
          SourceLocationScan: 'RCV-STG-01',
          TargetLocationScan: 'A-01',
          LpnScan: 'LPN-001',
          ConfirmedQuantity: 5,
          IdempotencyKey: 'confirm-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(inventoryTransactions.transactions).toHaveLength(0);
    expect(integrations.outboxMessages).toHaveLength(0);
    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(5);
    expect(audited.entries[0]).toMatchObject({
      ObjectType: ObjectType.PutawayTask,
      Result: AuditResult.Failed,
      AfterJson: expect.objectContaining({
        Reason: 'Putaway confirmation would create negative source available balance',
      }),
    });
  });
});
