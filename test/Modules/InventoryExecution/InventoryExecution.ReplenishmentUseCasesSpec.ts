import { BusinessRuleException, ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReplenishmentTaskLifecycleService } from '@modules/InventoryExecution/Application/Services/ReplenishmentTaskLifecycleService';
import { IReplenishmentTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IReplenishmentTaskRepository';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { ReplenishmentTaskEntity } from '@modules/InventoryExecution/Domain/Entities/ReplenishmentTaskEntity';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IntegrationReconciliationItemEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationItemEntity';
import { IntegrationReconciliationRunEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationRunEntity';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
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

const now = new Date('2026-06-23T00:00:00.000Z');
const ctx: AuditContext = {
  ActorUserId: 'user-1',
  ActorRoleCodes: ['WAREHOUSE_OPERATOR'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const makeStatus = (code = 'AVAILABLE') =>
  new InventoryStatusEntity({
    Id: `status-${code}`,
    StatusCode: code,
    DisplayName: code,
    StageGroup: 'Inventory',
    AllowsAllocation: true,
    AllowsPick: true,
    SortOrder: 1,
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const makeDimension = (overrides: Partial<InventoryDimensionEntity> = {}) =>
  new InventoryDimensionEntity({
    Id: overrides.Id ?? 'dimension-source',
    OwnerId: overrides.OwnerId ?? 'owner-1',
    SkuId: overrides.SkuId ?? 'sku-1',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-1',
    LocationId: overrides.LocationId ?? 'reserve-1',
    InventoryStatusId: overrides.InventoryStatusId ?? 'status-AVAILABLE',
    DimensionKeyHash: overrides.DimensionKeyHash ?? `hash-${overrides.Id ?? 'source'}`,
    UomId: overrides.UomId ?? 'uom-1',
    LpnCode: overrides.LpnCode ?? null,
    LotNumber: overrides.LotNumber ?? null,
    ExpiryDate: overrides.ExpiryDate ?? null,
    SerialNumber: overrides.SerialNumber ?? null,
    ProductionDate: overrides.ProductionDate ?? null,
    CountryOfOrigin: overrides.CountryOfOrigin ?? null,
    CustomsStatus: overrides.CustomsStatus ?? null,
    SourceSystem: overrides.SourceSystem ?? 'LTA-WMS',
    ReferenceId: overrides.ReferenceId ?? null,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeBalance = (overrides: Partial<InventoryBalanceEntity> = {}) =>
  new InventoryBalanceEntity({
    Id: overrides.Id ?? 'balance-source',
    DimensionId: overrides.DimensionId ?? 'dimension-source',
    QtyOnHand: overrides.QtyOnHand ?? 50,
    QtyReserved: overrides.QtyReserved ?? 0,
    SourceSystem: overrides.SourceSystem ?? 'LTA-WMS',
    ReferenceId: overrides.ReferenceId ?? null,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeLocation = (overrides: Partial<LocationEntity> = {}) =>
  new LocationEntity({
    Id: overrides.Id ?? 'pick-face-1',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-1',
    ZoneId: overrides.ZoneId ?? 'zone-1',
    LocationCode: overrides.LocationCode ?? 'PF-01',
    LocationName: overrides.LocationName ?? 'Pick Face 01',
    LocationType: overrides.LocationType ?? 'PickFace',
    LocationProfileId: overrides.LocationProfileId ?? 'profile-pick-face',
    LocationStatus: overrides.LocationStatus ?? LocationStatus.Active,
    CapacityQty: overrides.CapacityQty ?? 100,
    OwnerRestriction: overrides.OwnerRestriction ?? null,
    MixSkuPolicy: overrides.MixSkuPolicy ?? null,
    MixLotPolicy: overrides.MixLotPolicy ?? null,
    MixOwnerPolicy: overrides.MixOwnerPolicy ?? null,
    PickSequence: overrides.PickSequence ?? 10,
    PutawaySequence: overrides.PutawaySequence ?? null,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeProfile = (overrides: Partial<LocationProfileEntity> = {}) =>
  new LocationProfileEntity({
    Id: overrides.Id ?? 'profile-pick-face',
    ProfileCode: overrides.ProfileCode ?? 'PICK-FACE',
    ProfileName: overrides.ProfileName ?? 'Pick Face',
    LocationType: overrides.LocationType ?? 'PickFace',
    Status: overrides.Status ?? MasterDataStatus.Active,
    CapacityPolicy: overrides.CapacityPolicy ?? {},
    EligibilityPolicy: overrides.EligibilityPolicy ?? { pickFace: true },
    MixPolicy: overrides.MixPolicy ?? {},
    OperationPolicy: overrides.OperationPolicy ?? { replenishmentAllowed: true },
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

const makeCoverage = (overrides: Partial<ItemCoverageEntity> = {}) =>
  new ItemCoverageEntity({
    Id: overrides.Id ?? 'coverage-1',
    SkuId: overrides.SkuId ?? 'sku-1',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-1',
    OwnerId: overrides.OwnerId ?? 'owner-1',
    MinQty: overrides.MinQty ?? 20,
    MaxQty: overrides.MaxQty ?? 80,
    StandardQty: overrides.StandardQty ?? 12,
    MultipleQty: overrides.MultipleQty ?? null,
    LeadTimeDays: overrides.LeadTimeDays ?? null,
    ReorderPolicy: overrides.ReorderPolicy ?? { Method: 'MinMax' },
    StopReceiving: false,
    StopShipping: false,
    Status: overrides.Status ?? MasterDataStatus.Active,
    CreatedAt: overrides.CreatedAt ?? now,
    UpdatedAt: overrides.UpdatedAt ?? now,
  });

class MemoryReplenishmentTaskRepository implements IReplenishmentTaskRepository {
  public tasks: ReplenishmentTaskEntity[] = [];

  async Create(task: ReplenishmentTaskEntity): Promise<ReplenishmentTaskEntity> {
    if (this.tasks.some((item) => item.ReleaseIdempotencyKey === task.ReleaseIdempotencyKey)) {
      throw new ConflictException('duplicate replenishment idempotency');
    }
    this.tasks.push(task);
    return task;
  }

  async Update(task: ReplenishmentTaskEntity): Promise<ReplenishmentTaskEntity> {
    const index = this.tasks.findIndex((item) => item.Id === task.Id);
    if (index < 0) throw new Error('task not found');
    this.tasks[index] = task;
    return task;
  }

  async FindById(id: string): Promise<ReplenishmentTaskEntity | null> {
    return this.tasks.find((item) => item.Id === id) ?? null;
  }

  async FindByIdForUpdate(id: string): Promise<ReplenishmentTaskEntity | null> {
    return this.FindById(id);
  }

  async FindByReleaseIdempotencyKey(key: string): Promise<ReplenishmentTaskEntity | null> {
    return this.tasks.find((item) => item.ReleaseIdempotencyKey === key) ?? null;
  }

  async SumOpenSourceQuantity(sourceBalanceId: string, excludeTaskId?: string): Promise<number> {
    return this.tasks
      .filter(
        (item) =>
          item.SourceBalanceId === sourceBalanceId &&
          item.TaskStatus === ReplenishmentTaskStatus.Released &&
          item.Id !== excludeTaskId,
      )
      .reduce((sum, item) => sum + item.Quantity, 0);
  }

  async SumOpenTargetQuantity(
    filter: Parameters<IReplenishmentTaskRepository['SumOpenTargetQuantity']>[0],
  ): Promise<number> {
    return this.tasks
      .filter(
        (item) =>
          item.TargetLocationId === filter.TargetLocationId &&
          item.TaskStatus === ReplenishmentTaskStatus.Released &&
          item.Id !== filter.ExcludeTaskId &&
          (!filter.OwnerId || item.OwnerId === filter.OwnerId) &&
          (!filter.SkuId || item.SkuId === filter.SkuId) &&
          (filter.UomId === undefined || item.UomId === filter.UomId),
      )
      .reduce((sum, item) => sum + item.Quantity, 0);
  }

  async List(
    skip: number,
    take: number,
    filter: Parameters<IReplenishmentTaskRepository['List']>[2] = {},
  ): Promise<{ Items: ReplenishmentTaskEntity[]; TotalItems: number }> {
    let items = [...this.tasks];
    if (filter.WarehouseId) items = items.filter((task) => task.WarehouseId === filter.WarehouseId);
    if (filter.OwnerId) items = items.filter((task) => task.OwnerId === filter.OwnerId);
    if (filter.TaskStatus) items = items.filter((task) => task.TaskStatus === filter.TaskStatus);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class MemoryInventoryBalanceRepository implements IInventoryBalanceRepository {
  constructor(public balances: InventoryBalanceEntity[]) {}
  async FindById(id: string) {
    return this.balances.find((item) => item.Id === id) ?? null;
  }
  async FindByDimensionId(dimensionId: string) {
    return this.balances.find((item) => item.DimensionId === dimensionId) ?? null;
  }
  async FindByDimensionIdForUpdate(dimensionId: string) {
    return this.FindByDimensionId(dimensionId);
  }
  async FindOrCreateByDimensionIdForUpdate(balance: InventoryBalanceEntity) {
    const existing = await this.FindByDimensionId(balance.DimensionId);
    if (existing) return existing;
    this.balances.push(balance);
    return balance;
  }
  async Create(balance: InventoryBalanceEntity) {
    this.balances.push(balance);
    return balance;
  }
  async Update(balance: InventoryBalanceEntity) {
    const index = this.balances.findIndex((item) => item.Id === balance.Id);
    if (index >= 0) this.balances[index] = balance;
    return balance;
  }
  async List() {
    return { Items: this.balances, TotalItems: this.balances.length };
  }
}

class MemoryInventoryDimensionRepository implements IInventoryDimensionRepository {
  constructor(public dimensions: InventoryDimensionEntity[]) {}
  async FindById(id: string) {
    return this.dimensions.find((item) => item.Id === id) ?? null;
  }
  async FindByHash(hash: string) {
    return this.dimensions.find((item) => item.DimensionKeyHash === hash) ?? null;
  }
  async FindOrCreateByHashForUpdate(dimension: InventoryDimensionEntity) {
    const existing = await this.FindByHash(dimension.DimensionKeyHash);
    if (existing) return existing;
    this.dimensions.push(dimension);
    return dimension;
  }
  async Create(dimension: InventoryDimensionEntity) {
    this.dimensions.push(dimension);
    return dimension;
  }
  async List(skip: number, take: number, filter: Parameters<IInventoryDimensionRepository['List']>[2] = {}) {
    let items = [...this.dimensions];
    if (filter.OwnerId) items = items.filter((item) => item.OwnerId === filter.OwnerId);
    if (filter.SkuId) items = items.filter((item) => item.SkuId === filter.SkuId);
    if (filter.WarehouseId) items = items.filter((item) => item.WarehouseId === filter.WarehouseId);
    if (filter.LocationId) items = items.filter((item) => item.LocationId === filter.LocationId);
    if (filter.InventoryStatusId) items = items.filter((item) => item.InventoryStatusId === filter.InventoryStatusId);
    if (filter.UomId !== undefined) items = items.filter((item) => item.UomId === filter.UomId);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class MemoryInventoryStatusRepository implements IInventoryStatusRepository {
  constructor(public statuses = [makeStatus('AVAILABLE'), makeStatus('HOLD')]) {}
  async FindById(id: string) {
    return this.statuses.find((item) => item.Id === id) ?? null;
  }
  async FindByCode(code: string) {
    return this.statuses.find((item) => item.StatusCode === code) ?? null;
  }
  async Create(entity: InventoryStatusEntity) {
    this.statuses.push(entity);
    return entity;
  }
  async Update(entity: InventoryStatusEntity) {
    return entity;
  }
  async List() {
    return { Items: this.statuses, TotalItems: this.statuses.length };
  }
}

class MemoryLocationRepository implements ILocationRepository {
  constructor(
    public locations = [
      makeLocation(),
      makeLocation({ Id: 'reserve-1', LocationCode: 'RSV-01', LocationType: 'Reserve', PickSequence: null }),
    ],
  ) {}
  async FindById(id: string) {
    return this.locations.find((item) => item.Id === id) ?? null;
  }
  async FindByWarehouseAndCode(warehouseId: string, locationCode: string) {
    return (
      this.locations.find((item) => item.WarehouseId === warehouseId && item.LocationCode === locationCode) ?? null
    );
  }
  async Create(entity: LocationEntity) {
    this.locations.push(entity);
    return entity;
  }
  async Update(entity: LocationEntity) {
    return entity;
  }
  async List() {
    return { Items: this.locations, TotalItems: this.locations.length };
  }
  async ListForTree() {
    return this.locations;
  }
}

class MemoryLocationProfileRepository implements ILocationProfileRepository {
  constructor(public profiles = [makeProfile()]) {}
  async FindById(id: string) {
    return this.profiles.find((item) => item.Id === id) ?? null;
  }
  async FindByCode(code: string) {
    return this.profiles.find((item) => item.ProfileCode === code) ?? null;
  }
  async Create(entity: LocationProfileEntity) {
    this.profiles.push(entity);
    return entity;
  }
  async Update(entity: LocationProfileEntity) {
    return entity;
  }
  async List() {
    return { Items: this.profiles, TotalItems: this.profiles.length };
  }
}

class MemoryItemCoverageRepository implements IItemCoverageRepository {
  constructor(public coverages = [makeCoverage()]) {}
  async FindById(id: string) {
    return this.coverages.find((item) => item.Id === id) ?? null;
  }
  async FindBySkuWarehouseOwner(skuId: string, warehouseId: string, ownerId: string | null) {
    return (
      this.coverages.find(
        (item) => item.SkuId === skuId && item.WarehouseId === warehouseId && item.OwnerId === ownerId,
      ) ?? null
    );
  }
  async Create(entity: ItemCoverageEntity) {
    this.coverages.push(entity);
    return entity;
  }
  async Update(entity: ItemCoverageEntity) {
    return entity;
  }
  async List() {
    return { Items: this.coverages, TotalItems: this.coverages.length };
  }
}

class MemoryIntegrationRepository implements IIntegrationRepository {
  public outbox: OutboxMessageEntity[] = [];
  async FindInterfaceMessageByMessageId() {
    return null;
  }
  async FindOutboxMessageByMessageId(messageId: string) {
    return this.outbox.find((item) => item.MessageId === messageId) ?? null;
  }
  async FindOutboxMessageById(id: string) {
    return this.outbox.find((item) => item.Id === id) ?? null;
  }
  async CreateImport(importBatch: never, interfaceMessages: never[], outboxMessages: OutboxMessageEntity[]) {
    return { ImportBatch: importBatch, InterfaceMessages: interfaceMessages, OutboxMessages: outboxMessages };
  }
  async CreateOutboxMessage(message: OutboxMessageEntity) {
    this.outbox.push(message);
    return message;
  }
  async UpdateOutboxMessage(message: OutboxMessageEntity) {
    const index = this.outbox.findIndex((item) => item.Id === message.Id);
    if (index >= 0) this.outbox[index] = message;
    else this.outbox.push(message);
    return message;
  }
  async ListImportBatches() {
    return { Items: [], TotalItems: 0 };
  }
  async ListInterfaceMessages() {
    return { Items: [], TotalItems: 0 };
  }
  async ListOutboxMessages() {
    return { Items: this.outbox, TotalItems: this.outbox.length };
  }
  async FindReconciliationRunById(): Promise<IntegrationReconciliationRunEntity | null> {
    return null;
  }
  async FindReconciliationRunByIdempotencyKey(): Promise<IntegrationReconciliationRunEntity | null> {
    return null;
  }
  async CreateReconciliationRun(run: IntegrationReconciliationRunEntity, items: IntegrationReconciliationItemEntity[]) {
    return { Run: run, Items: items };
  }
  async UpdateReconciliationRun(run: IntegrationReconciliationRunEntity) {
    return run;
  }
  async ListReconciliationRuns() {
    return { Items: [] as IntegrationReconciliationRunEntity[], TotalItems: 0 };
  }
  async FindReconciliationItemById(): Promise<IntegrationReconciliationItemEntity | null> {
    return null;
  }
  async UpdateReconciliationItem(item: IntegrationReconciliationItemEntity) {
    return item;
  }
  async ListReconciliationItems() {
    return { Items: [] as IntegrationReconciliationItemEntity[], TotalItems: 0 };
  }
}

class MemoryExceptionCaseRepository implements IExceptionCaseRepository {
  public cases: ExceptionCaseEntity[] = [];
  async FindById(id: string) {
    return this.cases.find((item) => item.Id === id) ?? null;
  }
  async FindByIdForUpdate(id: string) {
    return this.FindById(id);
  }
  async Create(entity: ExceptionCaseEntity) {
    this.cases.push(entity);
    return entity;
  }
  async Update(entity: ExceptionCaseEntity) {
    return entity;
  }
  async List(skip: number, take: number, filter: Parameters<IExceptionCaseRepository['List']>[2] = {}) {
    let items = [...this.cases];
    if (filter.ReferenceType) items = items.filter((item) => item.ReferenceType === filter.ReferenceType);
    if (filter.ReferenceId) items = items.filter((item) => item.ReferenceId === filter.ReferenceId);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class AllowAllPermissionChecker implements IPermissionChecker {
  public Checks: { Action: ActionCode; ObjectType: ObjectType }[] = [];
  async Check(input: Parameters<IPermissionChecker['Check']>[0]) {
    this.Checks.push({ Action: input.Action, ObjectType: input.ObjectType });
    return { Allowed: true };
  }
}

class DenyPermissionChecker extends AllowAllPermissionChecker {
  async Check(input: Parameters<IPermissionChecker['Check']>[0]) {
    this.Checks.push({ Action: input.Action, ObjectType: input.ObjectType });
    return { Allowed: false, Reason: 'PERMISSION_DENIED' as const };
  }
}

class SimpleReasonCatalog implements IReasonCodeCatalog {
  async ValidateReason(input: Parameters<IReasonCodeCatalog['ValidateReason']>[0]) {
    if (!input.ReasonCode) throw new BusinessRuleException('ReasonCode is required');
    if (input.ReasonCode === 'RC-V1-REPLENISHMENT' && input.ObjectType !== ObjectType.ReplenishmentTask) {
      throw new BusinessRuleException('wrong object');
    }
    return {
      ReasonCodeId: `reason-${input.ReasonCode}`,
      EvidenceRequired: input.ReasonCode === 'RC-V1-DEAD-LETTER-FIX',
      ApprovalRequired: false,
    };
  }
}

class StubInventoryControlUseCase {
  public Moves: unknown[] = [];
  async MoveInternalInTransaction(request: unknown) {
    this.Moves.push(request);
    return {
      result: {
        InventoryTransaction: { Id: 'tx-1', TransactionCode: 'ITX-1' },
        InventoryMovement: { Id: 'move-1', MovementCode: 'IMV-1' },
        SourceBalance: { BalanceId: 'balance-source' },
        TargetBalance: { BalanceId: 'balance-target' },
        OutboxMessageId: 'outbox-move-1',
        EventType: 'InventoryMoved',
        IsDuplicate: false,
      },
      entry: {
        Action: ActionCode.Adjust,
        ObjectType: ObjectType.InventoryMovement,
        ObjectId: 'move-1',
        Result: AuditResult.Success,
      } as AuditEntry,
    };
  }
}

const buildService = (
  overrides: Partial<{
    balances: MemoryInventoryBalanceRepository;
    dimensions: MemoryInventoryDimensionRepository;
    statuses: MemoryInventoryStatusRepository;
    locations: MemoryLocationRepository;
    profiles: MemoryLocationProfileRepository;
    coverages: MemoryItemCoverageRepository;
    permissions: IPermissionChecker;
  }> = {},
) => {
  const sourceDimension = makeDimension();
  const targetDimension = makeDimension({
    Id: 'dimension-target',
    LocationId: 'pick-face-1',
    DimensionKeyHash: 'hash-target',
  });
  const balances =
    overrides.balances ??
    new MemoryInventoryBalanceRepository([
      makeBalance(),
      makeBalance({ Id: 'balance-target', DimensionId: targetDimension.Id, QtyOnHand: 5 }),
    ]);
  const dimensions = overrides.dimensions ?? new MemoryInventoryDimensionRepository([sourceDimension, targetDimension]);
  const statuses = overrides.statuses ?? new MemoryInventoryStatusRepository();
  const integrations = new MemoryIntegrationRepository();
  const exceptions = new MemoryExceptionCaseRepository();
  const inventoryControl = new StubInventoryControlUseCase();
  const audited = {
    Run: async <T>(work: (manager: never) => Promise<{ result: T; entry: AuditEntry | AuditEntry[] }>) =>
      (await work(undefined as never)).result,
  } as unknown as AuditedTransaction;
  const service = new ReplenishmentTaskLifecycleService(
    new MemoryReplenishmentTaskRepository(),
    inventoryControl as unknown as InventoryControlUseCase,
    balances,
    dimensions,
    statuses,
    overrides.locations ?? new MemoryLocationRepository(),
    overrides.profiles ?? new MemoryLocationProfileRepository(),
    overrides.coverages ?? new MemoryItemCoverageRepository(),
    integrations,
    exceptions,
    new SimpleReasonCatalog(),
    audited,
    overrides.permissions ?? new AllowAllPermissionChecker(),
  );
  return { service, balances, dimensions, statuses, integrations, exceptions, inventoryControl };
};

describe('ReplenishmentTaskLifecycleService', () => {
  it('releases replenishment only from AVAILABLE source with min-max pick face evidence and outbox', async () => {
    const { service, integrations } = buildService();

    const result = await service.Release(
      {
        TriggerType: ReplenishmentTriggerType.MinMax,
        SourceBalanceId: 'balance-source',
        TargetLocationId: 'pick-face-1',
        Quantity: 12,
        ReasonCode: 'RC-V1-REPLENISHMENT',
        ReasonNote: 'pick face below min',
        EvidenceRefs: ['PF-MIN-001'],
        IdempotencyKey: 'repl-release-1',
      },
      ctx,
    );

    expect(result.ReplenishmentTask.TaskStatus).toBe(ReplenishmentTaskStatus.Released);
    expect(result.ReplenishmentTask.SourceInventoryStatusCode).toBe('AVAILABLE');
    expect(result.ReplenishmentTask.TargetLocationId).toBe('pick-face-1');
    expect(result.EventType).toBe('ReplenishmentTaskReleased');
    expect(integrations.outbox).toHaveLength(1);
    expect(integrations.outbox[0].EventType).toBe('ReplenishmentTaskReleased');

    const duplicate = await service.Release(
      {
        TriggerType: ReplenishmentTriggerType.MinMax,
        SourceBalanceId: 'balance-source',
        TargetLocationId: 'pick-face-1',
        Quantity: 12,
        ReasonCode: 'RC-V1-REPLENISHMENT',
        ReasonNote: 'pick face below min',
        EvidenceRefs: ['PF-MIN-001'],
        IdempotencyKey: 'repl-release-1',
      },
      ctx,
    );

    expect(duplicate.IsDuplicate).toBe(true);
    expect(duplicate.ReplenishmentTask.Id).toBe(result.ReplenishmentTask.Id);
  });

  it('rejects non-AVAILABLE source without creating task or outbox', async () => {
    const sourceDimension = makeDimension({ InventoryStatusId: 'status-HOLD' });
    const { service, integrations } = buildService({
      dimensions: new MemoryInventoryDimensionRepository([
        sourceDimension,
        makeDimension({ Id: 'dimension-target', LocationId: 'pick-face-1', DimensionKeyHash: 'hash-target' }),
      ]),
    });

    await expect(
      service.Release(
        {
          TriggerType: ReplenishmentTriggerType.MinMax,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['PF-MIN-001'],
          IdempotencyKey: 'repl-release-2',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(integrations.outbox).toHaveLength(0);
  });

  it('rejects target capacity overflow and owner restriction violations before release', async () => {
    const { service } = buildService({
      locations: new MemoryLocationRepository([
        makeLocation({ CapacityQty: 10 }),
        makeLocation({ Id: 'reserve-1', LocationCode: 'RSV-01', LocationType: 'Reserve', PickSequence: null }),
      ]),
    });

    await expect(
      service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['DEMAND-1'],
          IdempotencyKey: 'repl-release-3',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const ownerBlocked = buildService({
      locations: new MemoryLocationRepository([
        makeLocation({ OwnerRestriction: 'owner-2' }),
        makeLocation({ Id: 'reserve-1', LocationCode: 'RSV-01', LocationType: 'Reserve', PickSequence: null }),
      ]),
    });
    await expect(
      ownerBlocked.service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['OWNER-BLOCK'],
          IdempotencyKey: 'repl-release-owner-block',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const policyBlocked = buildService({
      profiles: new MemoryLocationProfileRepository([makeProfile({ OperationPolicy: { replenishmentBlocked: true } })]),
    });
    await expect(
      policyBlocked.service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['POLICY-BLOCK'],
          IdempotencyKey: 'repl-release-policy-block',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const explicitPolicyBlocked = buildService({
      profiles: new MemoryLocationProfileRepository([
        makeProfile({ OperationPolicy: { replenishmentAllowed: false } }),
      ]),
    });
    await expect(
      explicitPolicyBlocked.service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['POLICY-FALSE'],
          IdempotencyKey: 'repl-release-policy-false',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects release when target is source location or NoMix target already holds another SKU', async () => {
    const { service } = buildService();

    await expect(
      service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'reserve-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['NOOP-TARGET'],
          IdempotencyKey: 'repl-release-source-target-same',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const sourceDimension = makeDimension();
    const otherSkuDimension = makeDimension({
      Id: 'dimension-other-sku',
      SkuId: 'sku-2',
      LocationId: 'pick-face-1',
      DimensionKeyHash: 'hash-other-sku',
    });
    const noMixTarget = buildService({
      dimensions: new MemoryInventoryDimensionRepository([sourceDimension, otherSkuDimension]),
      balances: new MemoryInventoryBalanceRepository([
        makeBalance({ DimensionId: sourceDimension.Id }),
        makeBalance({ Id: 'balance-other-sku', DimensionId: otherSkuDimension.Id, QtyOnHand: 5 }),
      ]),
      locations: new MemoryLocationRepository([
        makeLocation({ MixSkuPolicy: 'NoMix' }),
        makeLocation({ Id: 'reserve-1', LocationCode: 'RSV-01', LocationType: 'Reserve', PickSequence: null }),
      ]),
    });

    await expect(
      noMixTarget.service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['NO-MIX'],
          IdempotencyKey: 'repl-release-no-mix',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('requires emergency replenishment to carry short-pick reference or evidence', async () => {
    const { service } = buildService();

    await expect(
      service.Release(
        {
          TriggerType: ReplenishmentTriggerType.EmergencyShortPick,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: [],
          IdempotencyKey: 'repl-release-4',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('blocks release when open replenishment tasks would overcommit source availability', async () => {
    const { service } = buildService({
      balances: new MemoryInventoryBalanceRepository([
        makeBalance({ QtyOnHand: 100 }),
        makeBalance({ Id: 'balance-target', DimensionId: 'dimension-target', QtyOnHand: 5 }),
      ]),
      coverages: new MemoryItemCoverageRepository([makeCoverage({ MaxQty: 200 })]),
      locations: new MemoryLocationRepository([
        makeLocation({ CapacityQty: 200 }),
        makeLocation({ Id: 'reserve-1', LocationCode: 'RSV-01', LocationType: 'Reserve', PickSequence: null }),
      ]),
    });

    await service.Release(
      {
        TriggerType: ReplenishmentTriggerType.Demand,
        SourceBalanceId: 'balance-source',
        TargetLocationId: 'pick-face-1',
        Quantity: 70,
        ReasonCode: 'RC-V1-REPLENISHMENT',
        EvidenceRefs: ['DMD-1'],
        IdempotencyKey: 'repl-open-source-1',
      },
      ctx,
    );

    await expect(
      service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 40,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['DMD-2'],
          IdempotencyKey: 'repl-open-source-2',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('confirms replenishment by reusing inventory movement and prevents duplicate release mismatch', async () => {
    const { service, inventoryControl } = buildService();
    const released = await service.Release(
      {
        TriggerType: ReplenishmentTriggerType.MinMax,
        SourceBalanceId: 'balance-source',
        TargetLocationId: 'pick-face-1',
        Quantity: 12,
        ReasonCode: 'RC-V1-REPLENISHMENT',
        EvidenceRefs: ['PF-MIN-001'],
        IdempotencyKey: 'repl-release-5',
      },
      ctx,
    );

    await expect(
      service.Release(
        {
          TriggerType: ReplenishmentTriggerType.MinMax,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 11,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['PF-MIN-001'],
          IdempotencyKey: 'repl-release-5',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const confirmed = await service.Confirm(
      {
        TaskId: released.ReplenishmentTask.Id,
        ReasonCode: 'RC-V1-ADJUSTMENT',
        EvidenceRefs: ['RF-1'],
        IdempotencyKey: 'repl-confirm-1',
      },
      ctx,
    );

    expect(confirmed.ReplenishmentTask.TaskStatus).toBe(ReplenishmentTaskStatus.Confirmed);
    expect(inventoryControl.Moves).toHaveLength(1);

    const duplicate = await service.Confirm(
      {
        TaskId: released.ReplenishmentTask.Id,
        ReasonCode: 'RC-V1-ADJUSTMENT',
        EvidenceRefs: ['RF-1'],
        IdempotencyKey: 'repl-confirm-1',
      },
      ctx,
    );

    expect(duplicate.IsDuplicate).toBe(true);
    expect(duplicate.InventoryControl).toBeNull();
    expect(inventoryControl.Moves).toHaveLength(1);
  });

  it('enforces list scope and PageSize max 100', async () => {
    const { service } = buildService();
    await expect(service.List({ Page: 1, PageSize: 50 })).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(service.List({ WarehouseId: '   ', Page: 1, PageSize: 50 })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
    await expect(service.List({ WarehouseId: 'warehouse-1', Page: 1, PageSize: 101 })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('records reconciliation failure as exception/outbox without changing inventory balances', async () => {
    const { service, balances, exceptions, integrations } = buildService();
    const before = balances.balances.map((item) => item.QtyOnHand);

    const result = await service.RecordReconciliationFailure(
      {
        BusinessReference: 'ITX-001',
        EventType: 'InventoryReconciliationFailed',
        WarehouseId: 'warehouse-1',
        OwnerId: 'owner-1',
        ErrorMessage: 'ERP mismatch',
        RetryStatus: 'PendingRetry',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['SYNC-1'],
        IdempotencyKey: 'recon-fail-1',
        Payload: { ExpectedQty: 12, ActualQty: 10 },
      },
      ctx,
    );

    expect(result.EventType).toBe('InventoryReconciliationFailed');
    expect(result.ErrorMessage).toBe('ERP mismatch');
    expect(result.WarehouseId).toBe('warehouse-1');
    expect(result.OwnerId).toBe('owner-1');
    expect(exceptions.cases).toHaveLength(1);
    expect(integrations.outbox).toHaveLength(1);
    expect(balances.balances.map((item) => item.QtyOnHand)).toEqual(before);

    const duplicate = await service.RecordReconciliationFailure(
      {
        BusinessReference: 'ITX-001',
        EventType: 'InventoryReconciliationFailed',
        WarehouseId: 'warehouse-1',
        OwnerId: 'owner-1',
        ErrorMessage: 'ERP mismatch',
        RetryStatus: 'PendingRetry',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['SYNC-1'],
        IdempotencyKey: 'recon-fail-1',
        Payload: { ActualQty: 10, ExpectedQty: 12 },
      },
      ctx,
    );

    expect(duplicate.IsDuplicate).toBe(true);
    expect(duplicate.ExceptionCaseId).toBe(result.ExceptionCaseId);

    await expect(
      service.RecordReconciliationFailure(
        {
          BusinessReference: 'ITX-001',
          EventType: 'InventoryReconciliationFailed',
          WarehouseId: 'warehouse-1',
          OwnerId: 'owner-1',
          ErrorMessage: 'Different mismatch',
          RetryStatus: 'PendingRetry',
          ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
          EvidenceRefs: ['SYNC-1'],
          IdempotencyKey: 'recon-fail-1',
          Payload: { ExpectedQty: 12, ActualQty: 9 },
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies replenishment release when RBAC scope denies ReplenishmentTask create', async () => {
    const { service } = buildService({ permissions: new DenyPermissionChecker() });

    await expect(
      service.Release(
        {
          TriggerType: ReplenishmentTriggerType.Demand,
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'pick-face-1',
          Quantity: 12,
          ReasonCode: 'RC-V1-REPLENISHMENT',
          EvidenceRefs: ['DMD-1'],
          IdempotencyKey: 'repl-release-denied',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenAppException);
  });
});
