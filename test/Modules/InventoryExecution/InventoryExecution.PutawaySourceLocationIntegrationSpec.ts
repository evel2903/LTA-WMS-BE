import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { ConfirmPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ConfirmPutawayTaskUseCase';
import { ReleasePutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ReleasePutawayTaskUseCase';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  MakeInventoryBalance,
  MakeInventoryDimension,
  MakeInventoryStatus,
  MakeLocation,
  MakeSku,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
  MemoryLocationRepository,
  MemorySkuRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { BuildEmptyPutawayRuleGate } from '@test/TestDoubles/InventoryExecution/PutawayRuleGateTestDoubles';
import { EntityManager } from 'typeorm';

const now = new Date('2026-07-06T00:00:00.000Z');
const contextFor = (actor: string): AuditContext => ({ ...SystemAuditContext, ActorUserId: actor });

const makeRelease = (overrides: Partial<ConstructorParameters<typeof InboundPutawayReleaseEntity>[0]> = {}) =>
  new InboundPutawayReleaseEntity({
    Id: 'release-1',
    InboundLpnId: 'lpn-1',
    ReceiptId: 'receipt-1',
    ReceiptLineId: 'receipt-line-1',
    InboundPlanId: 'plan-1',
    InboundPlanLineId: 'plan-line-1',
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
    LotNumber: null,
    ExpiryDate: null,
    SerialNumber: null,
    InventoryStatusCode: 'READY_FOR_PUTAWAY',
    // IFB-13: this is the exact pre-fix shape of a release whose CurrentLocationId was never
    // resolved -- CurrentLocationCode defaulted to 'RECEIVING' independently of CurrentLocationId
    // defaulting to null. ReleasePutawayTaskUseCase must resolve a real id from this by itself.
    CurrentLocationId: null,
    CurrentLocationCode: 'RECEIVING',
    WarehouseProfileId: 'warehouse-profile-1',
    LabelDecision: null,
    LabelReason: null,
    MatchedPrintJobId: null,
    ConstraintJson: null,
    OutboxMessageId: 'outbox-inbound-1',
    CoreFlowMilestoneId: null,
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [],
    IdempotencyKey: 'release-key-1',
    ReleasedAt: now,
    ReleasedBy: 'operator-1',
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });

const makeProfile = () =>
  new LocationProfileEntity({
    Id: 'profile-active',
    ProfileCode: 'STORAGE',
    ProfileName: 'Storage',
    LocationType: 'Storage',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

class FakeReceivingRepository {
  constructor(private readonly release: InboundPutawayReleaseEntity) {}

  public async FindInboundPutawayReleaseById(id: string): Promise<InboundPutawayReleaseEntity | null> {
    return this.release.Id === id ? this.release : null;
  }
}

class MemoryPutawayTaskRepository implements IPutawayTaskRepository {
  public tasks: PutawayTaskEntity[] = [];

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
    if (index >= 0) this.tasks[index] = task;
    else this.tasks.push(task);
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
    if (filter?.InboundPutawayReleaseId) {
      items = items.filter((task) => task.InboundPutawayReleaseId === filter.InboundPutawayReleaseId);
    }
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class MemoryLocationProfileRepository implements Partial<ILocationProfileRepository> {
  constructor(private readonly profile: LocationProfileEntity | null = makeProfile()) {}

  public async FindById(): Promise<LocationProfileEntity | null> {
    return this.profile;
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

  public async FindTransactionByTypeAndIdempotencyKey(): Promise<InventoryTransactionEntity | null> {
    return null;
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

  public async FindCandidates(): Promise<MobileTaskEntity[]> {
    return [...this.tasks.values()];
  }

  public async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.tasks.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    return this.FindById(id);
  }

  public async FindBySourceDocument(
    sourceDocumentType: string,
    sourceDocumentId: string,
  ): Promise<MobileTaskEntity | null> {
    return (
      [...this.tasks.values()].find(
        (task) => task.SourceDocumentType === sourceDocumentType && task.SourceDocumentId === sourceDocumentId,
      ) ?? null
    );
  }

  public async FindScanEventsByTaskId(taskId: string): Promise<MobileScanEventEntity[]> {
    return this.scanEvents.filter((scan) => scan.TaskId === taskId);
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
  public async ValidateReason(): Promise<{
    ReasonCodeId: string;
    EvidenceRequired: boolean;
    ApprovalRequired: boolean;
  }> {
    return { ReasonCodeId: 'reason-1', EvidenceRequired: false, ApprovalRequired: false };
  }
}

class FakePermissionChecker implements IPermissionChecker {
  public async Check(): Promise<PermissionDecision> {
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

describe('IFB-13 putaway release -> confirm integration (SourceLocationId resolution)', () => {
  it('resolves SourceLocationId by warehouse+code when the release never had one, and the resulting task confirms successfully end to end', async () => {
    const release = makeRelease();
    const putawayTasks = new MemoryPutawayTaskRepository();
    const locations = new MemoryLocationRepository([
      MakeLocation({
        Id: 'loc-receiving',
        WarehouseId: release.WarehouseId,
        LocationCode: 'RECEIVING',
      }),
      MakeLocation({
        Id: 'loc-target',
        WarehouseId: release.WarehouseId,
        LocationCode: 'A-01',
        CapacityQty: 100,
        PutawaySequence: 10,
      }),
    ]);
    const skus = new MemorySkuRepository([MakeSku({ Id: release.SkuId })]);
    const integrations = new FakeIntegrationRepository();
    const taskExecution = new FakeTaskExecutionRepository();
    const reasonCatalog = new FakeReasonCatalog();
    const audited = new FakeAuditedTransaction();
    const permission = new FakePermissionChecker();

    const releaseUseCase = new ReleasePutawayTaskUseCase(
      putawayTasks,
      new FakeReceivingRepository(release) as unknown as IReceivingRepository,
      locations,
      skus,
      new MemoryLocationProfileRepository() as unknown as ILocationProfileRepository,
      BuildEmptyPutawayRuleGate(release.WarehouseId),
      integrations as unknown as IIntegrationRepository,
      taskExecution,
      reasonCatalog,
      audited as unknown as AuditedTransaction,
      permission,
    );

    const releasedDto = await releaseUseCase.Execute(
      { InboundPutawayReleaseId: release.Id, TargetLocationId: 'loc-target', IdempotencyKey: 'putaway-release-1' },
      contextFor('operator-1'),
    );

    // IFB-13 root fix: the release itself never resolved a CurrentLocationId (pre-fix shape), but
    // the putaway task must still end up with a real, non-null SourceLocationId -- looked up by
    // warehouse+code -- not the null that used to flow through untouched.
    expect(releasedDto.SourceLocationId).toBe('loc-receiving');
    expect(releasedDto.SourceLocationCode).toBe('RECEIVING');
    const releasedTask = putawayTasks.tasks[0];
    expect(releasedTask.SourceLocationId).toBe('loc-receiving');

    // The actual regression: before the fix, this step always failed with "Putaway task source
    // location is required for confirmation" because SourceLocationId was null. Feed the released
    // task straight into ConfirmPutawayTaskUseCase -- release -> confirm, not tested in isolation.
    const dimensionKeyService = new InventoryDimensionKeyService();
    const readyStatus = MakeInventoryStatus({
      Id: 'status-ready',
      StatusCode: 'READY_FOR_PUTAWAY',
      AllowsAllocation: false,
      AllowsPick: false,
    });
    const availableStatus = MakeInventoryStatus({
      Id: 'status-available',
      StatusCode: 'AVAILABLE',
      AllowsAllocation: true,
      AllowsPick: true,
    });
    const sourceHash = dimensionKeyService.BuildHash({
      OwnerId: releasedTask.OwnerId,
      SkuId: releasedTask.SkuId,
      WarehouseId: releasedTask.WarehouseId,
      LocationId: releasedTask.SourceLocationId as string,
      InventoryStatusId: readyStatus.Id,
      UomId: releasedTask.UomId,
      LpnCode: releasedTask.LpnCode,
      LotNumber: releasedTask.LotNumber,
      ExpiryDate: releasedTask.ExpiryDate,
      SerialNumber: releasedTask.SerialNumber,
    });
    const sourceDimension = MakeInventoryDimension({
      Id: 'dimension-source',
      OwnerId: releasedTask.OwnerId,
      SkuId: releasedTask.SkuId,
      WarehouseId: releasedTask.WarehouseId,
      LocationId: releasedTask.SourceLocationId as string,
      InventoryStatusId: readyStatus.Id,
      UomId: releasedTask.UomId,
      LpnCode: releasedTask.LpnCode,
      DimensionKeyHash: sourceHash,
    });
    const balances = new MemoryInventoryBalanceRepository();
    balances.balances.set(
      'balance-source',
      MakeInventoryBalance({
        Id: 'balance-source',
        DimensionId: sourceDimension.Id,
        QtyOnHand: releasedTask.Quantity,
        QtyReserved: 0,
      }),
    );
    const dimensions = new MemoryInventoryDimensionRepository();
    dimensions.dimensions.set(sourceDimension.Id, sourceDimension);
    const inventoryTransactions = new MemoryInventoryTransactionRepository();

    const confirmUseCase = new ConfirmPutawayTaskUseCase(
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

    const result = await confirmUseCase.Execute(
      releasedTask.Id,
      {
        SourceLocationScan: releasedTask.SourceLocationCode as string,
        TargetLocationScan: releasedTask.TargetLocationCode,
        LpnScan: releasedTask.LpnCode ?? undefined,
        IdempotencyKey: 'putaway-confirm-1',
      },
      contextFor('operator-1'),
    );

    expect(result.IsDuplicate).toBe(false);
    expect(result.PutawayTask.TaskStatus).toBe(PutawayTaskStatus.Confirmed);
    expect(result.InventoryTransaction.FromInventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(result.InventoryTransaction.ToInventoryStatusCode).toBe('AVAILABLE');
    expect(result.SourceBalance.QtyOnHand).toBe(0);
    expect(result.TargetBalance.QtyOnHand).toBe(releasedTask.Quantity);
  });

  it('fails release loudly instead of creating an unconfirmable task when no location matches the release code (IFB-13)', async () => {
    const release = makeRelease();
    const putawayTasks = new MemoryPutawayTaskRepository();
    // No location seeded for 'RECEIVING' in this warehouse -- the lookup must fail closed.
    const locations = new MemoryLocationRepository([
      MakeLocation({ Id: 'loc-target', WarehouseId: release.WarehouseId, LocationCode: 'A-01', CapacityQty: 100 }),
    ]);
    const skus = new MemorySkuRepository([MakeSku({ Id: release.SkuId })]);

    const releaseUseCase = new ReleasePutawayTaskUseCase(
      putawayTasks,
      new FakeReceivingRepository(release) as unknown as IReceivingRepository,
      locations,
      skus,
      new MemoryLocationProfileRepository() as unknown as ILocationProfileRepository,
      BuildEmptyPutawayRuleGate(release.WarehouseId),
      new FakeIntegrationRepository() as unknown as IIntegrationRepository,
      new FakeTaskExecutionRepository(),
      new FakeReasonCatalog(),
      new FakeAuditedTransaction() as unknown as AuditedTransaction,
      new FakePermissionChecker(),
    );

    await expect(
      releaseUseCase.Execute(
        { InboundPutawayReleaseId: release.Id, TargetLocationId: 'loc-target', IdempotencyKey: 'putaway-release-2' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(putawayTasks.tasks).toHaveLength(0);
  });

  it('fails release loudly when the release code resolves to an INACTIVE location, not just a missing one (IFB-13 dual-review patch)', async () => {
    const release = makeRelease();
    const putawayTasks = new MemoryPutawayTaskRepository();
    const locations = new MemoryLocationRepository([
      MakeLocation({
        Id: 'loc-receiving-inactive',
        WarehouseId: release.WarehouseId,
        LocationCode: 'RECEIVING',
        LocationStatus: LocationStatus.Inactive,
      }),
      MakeLocation({ Id: 'loc-target', WarehouseId: release.WarehouseId, LocationCode: 'A-01', CapacityQty: 100 }),
    ]);
    const skus = new MemorySkuRepository([MakeSku({ Id: release.SkuId })]);

    const releaseUseCase = new ReleasePutawayTaskUseCase(
      putawayTasks,
      new FakeReceivingRepository(release) as unknown as IReceivingRepository,
      locations,
      skus,
      new MemoryLocationProfileRepository() as unknown as ILocationProfileRepository,
      BuildEmptyPutawayRuleGate(release.WarehouseId),
      new FakeIntegrationRepository() as unknown as IIntegrationRepository,
      new FakeTaskExecutionRepository(),
      new FakeReasonCatalog(),
      new FakeAuditedTransaction() as unknown as AuditedTransaction,
      new FakePermissionChecker(),
    );

    await expect(
      releaseUseCase.Execute(
        { InboundPutawayReleaseId: release.Id, TargetLocationId: 'loc-target', IdempotencyKey: 'putaway-release-3' },
        contextFor('operator-1'),
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(putawayTasks.tasks).toHaveLength(0);
  });
});
