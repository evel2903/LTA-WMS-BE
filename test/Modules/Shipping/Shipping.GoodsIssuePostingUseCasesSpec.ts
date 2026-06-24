import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { EntityManager } from 'typeorm';
import { ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { IPackingRepository, PackageAggregate } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { ShippingStagingLifecycleService } from '@modules/Shipping/Application/Services/ShippingStagingLifecycleService';
import {
  EvaluateGoodsIssueTriggerUseCase,
  PostGoodsIssueUseCase,
} from '@modules/Shipping/Application/UseCases/ShippingStagingUseCases';
import { IShippingStagingRepository } from '@modules/Shipping/Application/Interfaces/IShippingStagingRepository';
import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';
import { GoodsIssueStatus } from '@modules/Shipping/Domain/Enums/GoodsIssueStatus';
import { GoodsIssueTriggerStatus } from '@modules/Shipping/Domain/Enums/GoodsIssueTriggerStatus';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';
import { ShippingStagingController } from '@modules/Shipping/Presentation/Controllers/ShippingStagingController';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

const now = new Date('2026-06-25T00:00:00.000Z');
const context: AuditContext = {
  ActorUserId: 'shipper-1',
  ActorRoleCodes: ['SHIPPER'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-v1-27',
  RequestId: 'req-v1-27',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

function makePackage(overrides: Partial<PackageEntity> = {}): PackageEntity {
  return new PackageEntity({
    Id: 'package-1',
    PackageCode: 'PKG-001',
    PackSessionId: 'pack-session-1',
    PickTaskId: 'pick-task-1',
    OutboundOrderId: 'outbound-order-1',
    WarehouseProfileId: 'profile-1',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-1',
    Status: PackageStatus.ReadyForStaging,
    CheckRequired: true,
    CheckResult: PackageCheckResult.Passed,
    CartonType: 'CTN-S',
    IdempotencyKey: 'package-create-1',
    PayloadFingerprint: 'package-fingerprint',
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

function makeContent(overrides: Partial<PackageContentEntity> = {}): PackageContentEntity {
  return new PackageContentEntity({
    Id: 'content-1',
    PackageId: 'package-1',
    PickTaskId: 'pick-task-1',
    OutboundOrderLineId: 'line-1',
    SourceBalanceId: 'balance-loaded',
    SourceDimensionId: 'dimension-loaded',
    SkuId: 'sku-1',
    SkuCode: 'SKU-1',
    UomId: 'uom-1',
    UomCode: 'EA',
    Quantity: 5,
    InventoryStatusCode: 'LOADED',
    LotNumber: 'LOT-1',
    SerialNumber: 'SER-1',
    ExpiryDate: new Date('2027-01-01T00:00:00.000Z'),
    CreatedAt: now,
    ...overrides,
  });
}

function makeDimension(overrides: Partial<InventoryDimensionEntity> = {}): InventoryDimensionEntity {
  return new InventoryDimensionEntity({
    Id: 'dimension-loaded',
    OwnerId: 'owner-1',
    SkuId: 'sku-1',
    WarehouseId: 'warehouse-1',
    LocationId: 'loc-loaded',
    InventoryStatusId: 'status-loaded',
    DimensionKeyHash: 'hash-loaded',
    UomId: 'uom-1',
    LpnCode: 'LPN-1',
    LotNumber: 'LOT-1',
    ExpiryDate: new Date('2027-01-01T00:00:00.000Z'),
    SerialNumber: 'SER-1',
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

function makeInventoryStatus(overrides: Partial<InventoryStatusEntity> = {}): InventoryStatusEntity {
  return new InventoryStatusEntity({
    Id: 'status-loaded',
    StatusCode: 'LOADED',
    DisplayName: 'Loaded',
    StageGroup: 'Outbound',
    AllowsAllocation: false,
    AllowsPick: false,
    Hold: false,
    IsTerminal: false,
    IsMilestone: false,
    SortOrder: 50,
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

function makeLocation(overrides: Partial<LocationEntity> = {}): LocationEntity {
  return new LocationEntity({
    Id: 'loc-loaded',
    WarehouseId: 'warehouse-1',
    ZoneId: 'zone-1',
    LocationCode: 'LOC-LOADED',
    LocationName: 'Loaded location',
    LocationType: 'STAGING',
    LocationProfileId: 'profile-loc-1',
    LocationStatus: LocationStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

function makeBalance(overrides: Partial<InventoryBalanceEntity> = {}): InventoryBalanceEntity {
  return new InventoryBalanceEntity({
    Id: 'balance-loaded',
    DimensionId: 'dimension-loaded',
    QtyOnHand: 10,
    QtyReserved: 0,
    SourceSystem: 'LTA-WMS',
    ReferenceId: 'loaded-stock',
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

function makeStaging(
  overrides: Partial<ConstructorParameters<typeof ShipmentPackageStagingEntity>[0]> = {},
): ShipmentPackageStagingEntity {
  return new ShipmentPackageStagingEntity({
    Id: 'staging-1',
    StagingCode: 'STG-001',
    PackageId: 'package-1',
    PackageCode: 'PKG-001',
    OutboundOrderId: 'outbound-order-1',
    WarehouseProfileId: 'profile-1',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-1',
    Status: ShipmentPackageStagingStatus.ShipmentConfirmed,
    InventoryStatusCode: 'LOADED',
    ShipmentReference: 'SHIP-001',
    StagingLaneCode: 'STAGE-A',
    CoreFlowInstanceId: 'core-flow-1',
    StageIdempotencyKey: 'stage-1',
    StagePayloadFingerprint: 'stage-fingerprint',
    GoodsIssueTrigger: 'at_loading',
    GoodsIssueTriggerStatus: GoodsIssueTriggerStatus.Ready,
    GoodsIssueTriggeredAt: now,
    GoodsIssueTriggeredBy: 'shipper-1',
    ReasonCode: 'RC-V1-DISCREPANCY',
    ReasonCodeId: 'reason-RC-V1-DISCREPANCY',
    EvidenceRefs: ['scan:stage'],
    StagedAt: now,
    StagedBy: 'shipper-1',
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });
}

class MemoryShippingStagingRepository implements IShippingStagingRepository {
  public items = [makeStaging()];

  async Create(entity: ShipmentPackageStagingEntity): Promise<ShipmentPackageStagingEntity> {
    this.items.push(entity);
    return entity;
  }

  async Update(entity: ShipmentPackageStagingEntity): Promise<ShipmentPackageStagingEntity> {
    this.items = this.items.map((item) => (item.Id === entity.Id ? entity : item));
    return entity;
  }

  async FindById(id: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.Id === id) ?? null;
  }

  async FindByIdForUpdate(id: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.FindById(id);
  }

  async FindByPackageId(packageId: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.PackageId === packageId) ?? null;
  }

  async FindByStageIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.StageIdempotencyKey === key) ?? null;
  }

  async FindByLoadingIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.LoadingIdempotencyKey === key) ?? null;
  }

  async FindByShipmentConfirmIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.ShipmentConfirmIdempotencyKey === key) ?? null;
  }

  async FindByGateOutIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.GateOutIdempotencyKey === key) ?? null;
  }

  async FindByGoodsIssueTriggerIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.GoodsIssueTriggerIdempotencyKey === key) ?? null;
  }

  async FindByGoodsIssueIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    return this.items.find((item) => item.GoodsIssueIdempotencyKey === key) ?? null;
  }

  async ListByShipmentReference(
    shipmentReference: string,
    scope: { WarehouseId?: string | null; OwnerId?: string | null; OutboundOrderId?: string | null } = {},
  ): Promise<ShipmentPackageStagingEntity[]> {
    return this.items.filter(
      (item) =>
        item.ShipmentReference === shipmentReference &&
        (!scope.WarehouseId || item.WarehouseId === scope.WarehouseId) &&
        (!scope.OwnerId || item.OwnerId === scope.OwnerId) &&
        (!scope.OutboundOrderId || item.OutboundOrderId === scope.OutboundOrderId),
    );
  }

  async List(
    skip = 0,
    take = this.items.length,
  ): Promise<{ Items: ShipmentPackageStagingEntity[]; TotalItems: number }> {
    return { Items: this.items.slice(skip, skip + take), TotalItems: this.items.length };
  }
}

class MemoryPackingRepository implements IPackingRepository {
  public packageAggregate: PackageAggregate | null = {
    Package: makePackage(),
    Contents: [makeContent()],
  };

  async CreateSession(session: PackSessionEntity): Promise<PackSessionEntity> {
    return session;
  }

  async UpdateSession(session: PackSessionEntity): Promise<PackSessionEntity> {
    return session;
  }

  async FindSessionById(): Promise<PackSessionEntity | null> {
    return null;
  }

  async FindSessionByIdForUpdate(): Promise<PackSessionEntity | null> {
    return null;
  }

  async FindSessionByIdempotencyKey(): Promise<PackSessionEntity | null> {
    return null;
  }

  async CreatePackage(pack: PackageEntity, contents: PackageContentEntity[]): Promise<PackageAggregate> {
    this.packageAggregate = { Package: pack, Contents: contents };
    return this.packageAggregate;
  }

  async UpdatePackage(pack: PackageEntity, contents?: PackageContentEntity[]): Promise<PackageAggregate> {
    this.packageAggregate = { Package: pack, Contents: contents ?? [] };
    return this.packageAggregate;
  }

  async FindPackageById(id: string): Promise<PackageAggregate | null> {
    return this.packageAggregate?.Package.Id === id ? this.packageAggregate : null;
  }

  async FindPackageByIdForUpdate(id: string): Promise<PackageAggregate | null> {
    return this.FindPackageById(id);
  }

  async FindPackageByIdempotencyKey(): Promise<PackageAggregate | null> {
    return null;
  }

  async ListPackages(): Promise<{ Items: PackageAggregate[]; TotalItems: number }> {
    return this.packageAggregate ? { Items: [this.packageAggregate], TotalItems: 1 } : { Items: [], TotalItems: 0 };
  }
}

class MemoryInventoryTransactionRepository implements IInventoryTransactionRepository {
  public transactions: InventoryTransactionEntity[] = [];
  public movements: InventoryMovementEntity[] = [];

  async CreateTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    if (
      this.transactions.some(
        (item) =>
          item.TransactionType === transaction.TransactionType && item.IdempotencyKey === transaction.IdempotencyKey,
      )
    ) {
      throw new ConflictException('Inventory transaction or movement unique constraint violated');
    }
    this.transactions.push(transaction);
    return transaction;
  }

  async CreateMovement(movement: InventoryMovementEntity): Promise<InventoryMovementEntity> {
    this.movements.push(movement);
    return movement;
  }

  async SaveTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    this.transactions = this.transactions.map((item) => (item.Id === transaction.Id ? transaction : item));
    return transaction;
  }

  async FindTransactionByIdempotencyKey(): Promise<InventoryTransactionEntity | null> {
    return null;
  }

  async FindTransactionByTypeAndIdempotencyKey(
    transactionType: InventoryTransactionType,
    idempotencyKey: string,
  ): Promise<InventoryTransactionEntity | null> {
    return (
      this.transactions.find(
        (item) => item.TransactionType === transactionType && item.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async FindMovementByTransactionId(transactionId: string): Promise<InventoryMovementEntity | null> {
    return this.movements.find((item) => item.InventoryTransactionId === transactionId) ?? null;
  }
}

class MemoryInventoryBalanceRepository implements IInventoryBalanceRepository {
  public balances = [makeBalance()];

  async FindById(id: string): Promise<InventoryBalanceEntity | null> {
    return this.balances.find((item) => item.Id === id) ?? null;
  }

  async FindByDimensionId(dimensionId: string): Promise<InventoryBalanceEntity | null> {
    return this.balances.find((item) => item.DimensionId === dimensionId) ?? null;
  }

  async FindByDimensionIdForUpdate(dimensionId: string): Promise<InventoryBalanceEntity | null> {
    return this.FindByDimensionId(dimensionId);
  }

  async FindOrCreateByDimensionIdForUpdate(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity> {
    const existing = await this.FindByDimensionId(balance.DimensionId);
    if (existing) return existing;
    this.balances.push(balance);
    return balance;
  }

  async Create(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity> {
    this.balances.push(balance);
    return balance;
  }

  async Update(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity> {
    this.balances = this.balances.map((item) => (item.Id === balance.Id ? balance : item));
    return balance;
  }

  async List(skip = 0, take = this.balances.length): Promise<{ Items: InventoryBalanceEntity[]; TotalItems: number }> {
    return { Items: this.balances.slice(skip, skip + take), TotalItems: this.balances.length };
  }
}

class MemoryInventoryDimensionRepository implements IInventoryDimensionRepository {
  public dimensions = [makeDimension()];

  async FindById(id: string): Promise<InventoryDimensionEntity | null> {
    return this.dimensions.find((item) => item.Id === id) ?? null;
  }

  async FindByHash(dimensionKeyHash: string): Promise<InventoryDimensionEntity | null> {
    return this.dimensions.find((item) => item.DimensionKeyHash === dimensionKeyHash) ?? null;
  }

  async FindOrCreateByHashForUpdate(dimension: InventoryDimensionEntity): Promise<InventoryDimensionEntity> {
    const existing = await this.FindByHash(dimension.DimensionKeyHash);
    if (existing) return existing;
    this.dimensions.push(dimension);
    return dimension;
  }

  async Create(dimension: InventoryDimensionEntity): Promise<InventoryDimensionEntity> {
    this.dimensions.push(dimension);
    return dimension;
  }

  async List(
    skip = 0,
    take = this.dimensions.length,
  ): Promise<{ Items: InventoryDimensionEntity[]; TotalItems: number }> {
    return { Items: this.dimensions.slice(skip, skip + take), TotalItems: this.dimensions.length };
  }
}

class MemoryInventoryStatusRepository implements IInventoryStatusRepository {
  public statuses = [makeInventoryStatus()];

  async FindById(id: string): Promise<InventoryStatusEntity | null> {
    return this.statuses.find((item) => item.Id === id) ?? null;
  }

  async FindByCode(statusCode: string): Promise<InventoryStatusEntity | null> {
    return this.statuses.find((item) => item.StatusCode === statusCode) ?? null;
  }

  async List(skip = 0, take = this.statuses.length): Promise<{ Items: InventoryStatusEntity[]; TotalItems: number }> {
    return { Items: this.statuses.slice(skip, skip + take), TotalItems: this.statuses.length };
  }

  async Update(status: InventoryStatusEntity): Promise<InventoryStatusEntity> {
    this.statuses = this.statuses.map((item) => (item.Id === status.Id ? status : item));
    return status;
  }
}

class MemoryLocationRepository implements ILocationRepository {
  public locations = [makeLocation()];

  async FindById(id: string): Promise<LocationEntity | null> {
    return this.locations.find((item) => item.Id === id) ?? null;
  }

  async FindByWarehouseAndCode(warehouseId: string, locationCode: string): Promise<LocationEntity | null> {
    return (
      this.locations.find((item) => item.WarehouseId === warehouseId && item.LocationCode === locationCode) ?? null
    );
  }

  async Create(location: LocationEntity): Promise<LocationEntity> {
    this.locations.push(location);
    return location;
  }

  async Update(location: LocationEntity): Promise<LocationEntity> {
    this.locations = this.locations.map((item) => (item.Id === location.Id ? location : item));
    return location;
  }

  async List(skip = 0, take = this.locations.length): Promise<{ Items: LocationEntity[]; TotalItems: number }> {
    return { Items: this.locations.slice(skip, skip + take), TotalItems: this.locations.length };
  }

  async ListForTree(): Promise<LocationEntity[]> {
    return this.locations;
  }
}

class MemoryIntegrationRepository implements IIntegrationRepository {
  public Outbox: OutboxMessageEntity[] = [];

  async FindInterfaceMessageByMessageId(): Promise<InterfaceMessageEntity | null> {
    return null;
  }

  async FindOutboxMessageByMessageId(messageId: string): Promise<OutboxMessageEntity | null> {
    return this.Outbox.find((item) => item.MessageId === messageId) ?? null;
  }

  async CreateImport(
    importBatch: ImportBatchEntity,
    interfaceMessages: InterfaceMessageEntity[],
    outboxMessages: OutboxMessageEntity[],
  ): Promise<{
    ImportBatch: ImportBatchEntity;
    InterfaceMessages: InterfaceMessageEntity[];
    OutboxMessages: OutboxMessageEntity[];
  }> {
    this.Outbox.push(...outboxMessages);
    return { ImportBatch: importBatch, InterfaceMessages: interfaceMessages, OutboxMessages: outboxMessages };
  }

  async CreateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.Outbox.push(outboxMessage);
    return outboxMessage;
  }

  async ListImportBatches(): Promise<{ Items: ImportBatchEntity[]; TotalItems: number }> {
    return { Items: [], TotalItems: 0 };
  }

  async ListOutboxMessages(): Promise<{ Items: OutboxMessageEntity[]; TotalItems: number }> {
    return { Items: this.Outbox, TotalItems: this.Outbox.length };
  }
}

class MemoryCoreFlowRepository implements ICoreFlowRepository {
  public instance = new CoreFlowInstanceEntity({
    Id: 'core-flow-1',
    BusinessReference: 'outbound-order-1',
    SourceSystem: 'WMS',
    WarehouseCode: 'WH-1',
    OwnerCode: 'OWN-1',
    CorrelationId: 'corr-v1-27',
    CurrentStage: CoreFlowStageCode.Shipping,
    Status: CoreFlowInstanceStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });
  public milestones: WorkflowMilestoneEntity[] = [];

  async CreateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    this.instance = instance;
    return instance;
  }

  async UpdateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    this.instance = instance;
    return instance;
  }

  async FindInstanceById(id: string): Promise<CoreFlowInstanceEntity | null> {
    return this.instance.Id === id ? this.instance : null;
  }

  async FindInstanceByBusinessReference(reference: string): Promise<CoreFlowInstanceEntity | null> {
    return this.instance.BusinessReference === reference ? this.instance : null;
  }

  async CreateMilestone(milestone: WorkflowMilestoneEntity): Promise<WorkflowMilestoneEntity> {
    this.milestones.push(milestone);
    return milestone;
  }

  async ListMilestones(): Promise<WorkflowMilestoneEntity[]> {
    return this.milestones;
  }

  async CreateHandoff(handoff: WorkflowHandoffEntity): Promise<WorkflowHandoffEntity> {
    return handoff;
  }
}

class MemoryWarehouseProfileRepository implements IWarehouseProfileRepository {
  public profile = new WarehouseProfileEntity({
    Id: 'profile-1',
    ProfileCode: 'WT-01',
    ProfileName: 'WT-01 Profile',
    WarehouseTypeCode: 'WT-01',
    Version: 1,
    Status: WarehouseProfileStatus.Active,
    ScopeKey: 'WT-01',
    EffectiveFrom: now,
    StrategyPolicy: {},
    CreatedAt: now,
    UpdatedAt: now,
  });

  async FindById(id: string): Promise<WarehouseProfileEntity | null> {
    return this.profile.Id === id ? this.profile : null;
  }

  async FindByCode(): Promise<WarehouseProfileEntity | null> {
    return null;
  }

  async Create(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    this.profile = profile;
    return profile;
  }

  async Update(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    this.profile = profile;
    return profile;
  }

  async List(): Promise<{ Items: WarehouseProfileEntity[]; TotalItems: number }> {
    return { Items: [this.profile], TotalItems: 1 };
  }

  async ListActiveByScope(): Promise<WarehouseProfileEntity[]> {
    return [this.profile];
  }

  async FindActiveOverlapping(): Promise<WarehouseProfileEntity[]> {
    return [];
  }

  async RunInTransaction<T>(work: (txRepository: IWarehouseProfileRepository, manager: EntityManager) => Promise<T>) {
    return work(this, {} as EntityManager);
  }
}

class MemoryAuditedTransaction {
  public entries: AuditEntry[] = [];

  async Run<T>(work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry | AuditEntry[] }>): Promise<T> {
    const { result, entry } = await work({} as EntityManager);
    this.entries.push(...(Array.isArray(entry) ? entry : [entry]));
    return result;
  }
}

const reasonCatalog: IReasonCodeCatalog = {
  ValidateReason: async (input) => ({
    ReasonCodeId: `reason-${input.ReasonCode}`,
    EvidenceRequired: input.ReasonCode === 'RC-V1-GOODS-ISSUE-CORRECTION',
    ApprovalRequired: false,
  }),
};

const allowPermissionChecker: IPermissionChecker = {
  Check: async (): Promise<PermissionDecision> => ({ Allowed: true }),
};

function makeHarness(
  input: {
    permissionChecker?: IPermissionChecker;
    dimension?: InventoryDimensionEntity;
    statuses?: InventoryStatusEntity[];
    locations?: LocationEntity[];
  } = {},
) {
  const stagings = new MemoryShippingStagingRepository();
  const packing = new MemoryPackingRepository();
  const coreFlows = new MemoryCoreFlowRepository();
  const integrations = new MemoryIntegrationRepository();
  const audited = new MemoryAuditedTransaction();
  const warehouseProfiles = new MemoryWarehouseProfileRepository();
  const inventoryTransactions = new MemoryInventoryTransactionRepository();
  const inventoryBalances = new MemoryInventoryBalanceRepository();
  const inventoryDimensions = new MemoryInventoryDimensionRepository();
  const inventoryStatuses = new MemoryInventoryStatusRepository();
  const locations = new MemoryLocationRepository();
  if (input.dimension) inventoryDimensions.dimensions = [input.dimension];
  if (input.statuses) inventoryStatuses.statuses = input.statuses;
  if (input.locations) locations.locations = input.locations;
  const service = new ShippingStagingLifecycleService(
    stagings,
    packing,
    coreFlows,
    integrations,
    reasonCatalog,
    audited as never,
    input.permissionChecker ?? allowPermissionChecker,
    warehouseProfiles,
    inventoryTransactions,
    inventoryBalances,
    inventoryDimensions,
    inventoryStatuses,
    locations,
  );
  return {
    service,
    stagings,
    packing,
    integrations,
    audited,
    inventoryTransactions,
    inventoryBalances,
    inventoryDimensions,
    inventoryStatuses,
    locations,
  };
}

describe('Shipping Goods Issue V1-27', () => {
  it('exposes Goods Issue posting route with GoodsIssue permission', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ShippingStagingController.prototype.PostGoodsIssue)).toBe(
      'packages/:id/goods-issue',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, ShippingStagingController.prototype.PostGoodsIssue)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ShippingStagingController.prototype.PostGoodsIssue)).toEqual({
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.GoodsIssue,
      Scope: undefined,
    });
  });

  it('posts Goods Issue once, deducts source balance, and queues owner-scoped events', async () => {
    const harness = makeHarness();

    const result = await harness.service.PostGoodsIssue(
      'staging-1',
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: ['gi:post'],
        IdempotencyKey: 'gi-1',
      },
      context,
    );

    expect(result).toMatchObject({
      GoodsIssueStatus: GoodsIssueStatus.Posted,
      GoodsIssueInventoryTransactionId: expect.any(String),
      GoodsIssueOutboxMessageId: expect.any(String),
      ShipmentClosedOutboxMessageId: expect.any(String),
    });
    expect(harness.inventoryBalances.balances[0]).toMatchObject({ Id: 'balance-loaded', QtyOnHand: 5 });
    expect(harness.inventoryTransactions.transactions).toHaveLength(1);
    expect(harness.inventoryTransactions.transactions[0]).toMatchObject({
      TransactionType: InventoryTransactionType.GoodsIssue,
      IdempotencyKey: expect.stringMatching(/^GI-LINE:/),
      Quantity: 5,
      OwnerCode: 'OWN-1',
      WarehouseCode: 'WH-1',
      FromInventoryStatusCode: 'LOADED',
      ToInventoryStatusCode: 'LOADED',
      FromLocationCode: 'LOC-LOADED',
      ToLocationCode: 'LOC-LOADED',
    });
    expect(harness.integrations.Outbox).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          EventType: 'GoodsIssuePosted',
          Status: OutboxMessageStatus.Pending,
          BusinessReference: 'SHIP-001',
          WarehouseContext: 'WH-1',
          OwnerContext: 'OWN-1',
          Payload: expect.objectContaining({
            EventName: 'GoodsIssuePosted',
            PackageCode: 'PKG-001',
            OwnerContext: 'OWN-1',
          }),
        }),
        expect.objectContaining({
          EventType: 'ShipmentClosed',
          Status: OutboxMessageStatus.Pending,
          BusinessReference: 'SHIP-001',
          OwnerContext: 'OWN-1',
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toMatch(/SHIPPED|GATE_OUT|GOODS_ISSUE_POSTED/);
  });

  it('releases reserved quantity while posting Goods Issue', async () => {
    const harness = makeHarness();
    harness.inventoryBalances.balances = [makeBalance({ QtyOnHand: 5, QtyReserved: 5 })];

    await harness.service.PostGoodsIssue(
      'staging-1',
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: ['gi:post'],
        IdempotencyKey: 'gi-1',
      },
      context,
    );

    expect(harness.inventoryBalances.balances[0]).toMatchObject({
      QtyOnHand: 0,
      QtyReserved: 0,
    });
  });

  it('does not emit ShipmentClosed until every package in the shipment has posted Goods Issue', async () => {
    const harness = makeHarness();
    harness.stagings.items = [
      makeStaging(),
      makeStaging({
        Id: 'staging-2',
        StagingCode: 'STG-002',
        PackageId: 'package-2',
        PackageCode: 'PKG-002',
        GoodsIssueStatus: null,
        GoodsIssueIdempotencyKey: null,
        GoodsIssuePayloadFingerprint: null,
      }),
    ];

    const result = await harness.service.PostGoodsIssue(
      'staging-1',
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: ['gi:post'],
        IdempotencyKey: 'gi-1',
      },
      context,
    );

    expect(result.ShipmentClosedOutboxMessageId).toBeNull();
    expect(harness.integrations.Outbox.map((item) => item.EventType)).toEqual(['GoodsIssuePosted']);
  });

  it('does not emit ShipmentClosed when shipment reference is missing', async () => {
    const harness = makeHarness();
    harness.stagings.items = [makeStaging({ ShipmentReference: null })];

    const result = await harness.service.PostGoodsIssue(
      'staging-1',
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: ['gi:post'],
        IdempotencyKey: 'gi-1',
      },
      context,
    );

    expect(result.ShipmentClosedOutboxMessageId).toBeNull();
    expect(harness.integrations.Outbox.map((item) => item.EventType)).toEqual(['GoodsIssuePosted']);
  });

  it('returns duplicate Goods Issue result without double deduction', async () => {
    const harness = makeHarness();
    await harness.service.PostGoodsIssue(
      'staging-1',
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: ['gi:post'],
        IdempotencyKey: 'gi-1',
      },
      context,
    );

    const duplicate = await harness.service.PostGoodsIssue(
      'staging-1',
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: ['gi:post'],
        IdempotencyKey: 'gi-1',
      },
      context,
    );

    expect(duplicate.GoodsIssueStatus).toBe(GoodsIssueStatus.Posted);
    expect(harness.inventoryBalances.balances[0].QtyOnHand).toBe(5);
    expect(harness.inventoryTransactions.transactions).toHaveLength(1);
  });

  it('rejects Goods Issue duplicate idempotency with changed payload', async () => {
    const harness = makeHarness();
    await harness.service.PostGoodsIssue(
      'staging-1',
      {
        ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
        EvidenceRefs: ['gi:post'],
        IdempotencyKey: 'gi-1',
      },
      context,
    );

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          ReasonNote: 'changed payload',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Goods Issue idempotency key already used');
  });

  it('blocks Goods Issue before trigger ready and writes failed audit', async () => {
    const harness = makeHarness();
    harness.stagings.items = [
      makeStaging({
        GoodsIssueTriggerStatus: GoodsIssueTriggerStatus.Pending,
        GoodsIssueTriggeredAt: null,
      }),
    ];

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Goods Issue trigger must be ready before posting');
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ObjectType: ObjectType.GoodsIssue,
          ReferenceType: 'GoodsIssueGate',
        }),
      ]),
    );
  });

  it('rejects forbidden shipment milestones as InventoryStatus for Goods Issue with failed audit', async () => {
    const harness = makeHarness();

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          InventoryStatusCode: 'GOODS_ISSUE_POSTED',
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Shipment/goods issue milestones must not be used as InventoryStatus');
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ObjectType: ObjectType.GoodsIssue,
          ReferenceType: 'GoodsIssueInventoryStatus',
        }),
      ]),
    );
  });

  it('blocks cross-owner Goods Issue posting by default', async () => {
    const harness = makeHarness({ dimension: makeDimension({ OwnerId: 'owner-other' }) });

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Goods Issue source inventory owner does not match shipment owner');
  });

  it('blocks Goods Issue when owner context is missing', async () => {
    const harness = makeHarness();
    harness.stagings.items = [makeStaging({ OwnerId: null, OwnerCode: null })];

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Goods Issue requires owner context before posting');
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ObjectType: ObjectType.GoodsIssue,
          ReferenceType: 'GoodsIssueGate',
        }),
      ]),
    );
  });

  it('blocks Goods Issue when owner id is missing even if owner code exists', async () => {
    const harness = makeHarness();
    harness.stagings.items = [makeStaging({ OwnerId: null, OwnerCode: 'OWN-1' })];

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Goods Issue requires owner and warehouse identifiers before posting');
    expect(harness.inventoryTransactions.transactions).toHaveLength(0);
  });

  it('blocks Goods Issue when source dimension status does not match package content', async () => {
    const harness = makeHarness({
      dimension: makeDimension({ InventoryStatusId: 'status-available' }),
      statuses: [
        makeInventoryStatus({ Id: 'status-loaded', StatusCode: 'LOADED' }),
        makeInventoryStatus({ Id: 'status-available', StatusCode: 'AVAILABLE' }),
      ],
    });

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Goods Issue source inventory status does not match package content');
    expect(harness.inventoryBalances.balances[0].QtyOnHand).toBe(10);
    expect(harness.inventoryTransactions.transactions).toHaveLength(0);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ObjectType: ObjectType.GoodsIssue,
          ReferenceType: 'GoodsIssueGate',
        }),
      ]),
    );
  });

  it('rejects forbidden package content InventoryStatus with failed audit', async () => {
    const harness = makeHarness();
    harness.packing.packageAggregate = {
      Package: makePackage(),
      Contents: [makeContent({ InventoryStatusCode: 'GATE_OUT' })],
    };

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Shipment/goods issue milestones must not be used as InventoryStatus');
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ObjectType: ObjectType.GoodsIssue,
          ReferenceType: 'GoodsIssueInventoryStatus',
        }),
      ]),
    );
  });

  it('blocks Goods Issue package content with zero quantity', async () => {
    const harness = makeHarness();
    harness.packing.packageAggregate = {
      Package: makePackage(),
      Contents: [makeContent({ Quantity: 0 })],
    };

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toThrow('Goods Issue package content quantity must be positive');
    expect(harness.inventoryTransactions.transactions).toHaveLength(0);
  });

  it('denies Goods Issue when GoodsIssue permission rejects actor', async () => {
    const denied: IPermissionChecker = {
      Check: async (input): Promise<PermissionDecision> => ({
        Allowed: input.ObjectType !== ObjectType.GoodsIssue,
        Reason: 'PERMISSION_DENIED',
      }),
    };
    const harness = makeHarness({ permissionChecker: denied });

    await expect(
      harness.service.PostGoodsIssue(
        'staging-1',
        {
          ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          EvidenceRefs: ['gi:post'],
          IdempotencyKey: 'gi-1',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenAppException);
    expect(harness.audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Result: AuditResult.Failed,
          ObjectType: ObjectType.GoodsIssue,
          ReferenceType: 'GoodsIssuePermission',
        }),
      ]),
    );
  });
});

describe('Shipping Goods Issue use case wrappers', () => {
  it('passes Goods Issue posting calls through the lifecycle use case', async () => {
    const lifecycle = { PostGoodsIssue: jest.fn(async () => ({ posted: true })) };
    const useCase = new PostGoodsIssueUseCase(lifecycle as never);

    await expect(
      useCase.Execute('staging-1', { IdempotencyKey: 'gi-1', EvidenceRefs: ['gi:post'] }, context),
    ).resolves.toEqual({ posted: true });
    expect(lifecycle.PostGoodsIssue).toHaveBeenCalledWith(
      'staging-1',
      { IdempotencyKey: 'gi-1', EvidenceRefs: ['gi:post'] },
      context,
    );
  });

  it('keeps the previous Goods Issue trigger wrapper available', async () => {
    const lifecycle = { EvaluateGoodsIssueTrigger: jest.fn(async () => ({ triggered: true })) };
    const useCase = new EvaluateGoodsIssueTriggerUseCase(lifecycle as never);

    await expect(useCase.Execute('staging-1', { IdempotencyKey: 'gi-trigger' }, context)).resolves.toEqual({
      triggered: true,
    });
  });
});
