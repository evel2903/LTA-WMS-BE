import {
  IInventoryBalanceRepository,
  InventoryBalanceListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import {
  IInventoryDimensionRepository,
  InventoryDimensionListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import {
  IInventoryStatusRepository,
  InventoryStatusListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import {
  ILocationRepository,
  LocationListFilter,
} from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IOwnerRepository, OwnerListFilter } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository, SkuListFilter } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository, UomListFilter } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import {
  IWarehouseRepository,
  WarehouseListFilter,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';
import { InventoryDimensionEntity } from '@modules/MasterData/Domain/Entities/InventoryDimensionEntity';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export const Now = new Date('2026-01-01T00:00:00.000Z');

export const MakeOwner = (overrides: Partial<ConstructorParameters<typeof OwnerEntity>[0]> = {}) =>
  new OwnerEntity({
    Id: 'owner-active',
    OwnerCode: 'OWNER-A',
    OwnerName: 'Owner A',
    Status: MasterDataStatus.Active,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export const MakeUom = (overrides: Partial<ConstructorParameters<typeof UomEntity>[0]> = {}) =>
  new UomEntity({
    Id: 'uom-ea',
    UomCode: 'EA',
    UomName: 'Each',
    Status: MasterDataStatus.Active,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export const MakeSku = (overrides: Partial<ConstructorParameters<typeof SkuEntity>[0]> = {}) =>
  new SkuEntity({
    Id: 'sku-active',
    SkuCode: 'SKU-A',
    SkuName: 'SKU A',
    DefaultOwnerId: 'owner-active',
    ItemClass: 'DRY',
    ItemStatus: SkuStatus.Active,
    BaseUomId: 'uom-ea',
    InventoryUomId: 'uom-ea',
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export const MakeWarehouse = (overrides: Partial<ConstructorParameters<typeof WarehouseEntity>[0]> = {}) =>
  new WarehouseEntity({
    Id: 'warehouse-active',
    SiteId: 'site-active',
    WarehouseCode: 'WH-A',
    WarehouseName: 'Warehouse A',
    WarehouseTypeCode: 'TIER_1',
    Status: MasterDataStatus.Active,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export const MakeLocation = (overrides: Partial<ConstructorParameters<typeof LocationEntity>[0]> = {}) =>
  new LocationEntity({
    Id: 'location-active',
    WarehouseId: 'warehouse-active',
    ZoneId: 'zone-active',
    LocationCode: 'A-01',
    LocationName: 'Aisle 01',
    LocationType: 'Storage',
    LocationProfileId: 'profile-active',
    LocationStatus: LocationStatus.Active,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export const MakeInventoryStatus = (overrides: Partial<ConstructorParameters<typeof InventoryStatusEntity>[0]> = {}) =>
  new InventoryStatusEntity({
    Id: 'status-available',
    StatusCode: 'AVAILABLE',
    DisplayName: 'Available',
    StageGroup: 'StorageControl',
    AllowsAllocation: true,
    AllowsPick: true,
    IsTerminal: false,
    IsMilestone: false,
    SortOrder: 100,
    Status: MasterDataStatus.Active,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export const MakeInventoryDimension = (
  overrides: Partial<ConstructorParameters<typeof InventoryDimensionEntity>[0]> = {},
) =>
  new InventoryDimensionEntity({
    Id: 'dimension-1',
    OwnerId: 'owner-active',
    SkuId: 'sku-active',
    WarehouseId: 'warehouse-active',
    LocationId: 'location-active',
    InventoryStatusId: 'status-available',
    DimensionKeyHash: 'a'.repeat(64),
    UomId: null,
    LpnCode: null,
    LotNumber: null,
    ExpiryDate: null,
    SerialNumber: null,
    ProductionDate: null,
    CountryOfOrigin: null,
    CustomsStatus: null,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export const MakeInventoryBalance = (
  overrides: Partial<ConstructorParameters<typeof InventoryBalanceEntity>[0]> = {},
) =>
  new InventoryBalanceEntity({
    Id: 'balance-1',
    DimensionId: 'dimension-1',
    QtyOnHand: 10,
    QtyReserved: 2,
    QtyAvailable: 8,
    CreatedAt: Now,
    UpdatedAt: Now,
    ...overrides,
  });

export class MemoryOwnerRepository implements IOwnerRepository {
  public readonly owners: Map<string, OwnerEntity>;

  constructor(owners: OwnerEntity[] = [MakeOwner()]) {
    this.owners = new Map(owners.map((owner) => [owner.Id, owner]));
  }

  public async FindById(id: string): Promise<OwnerEntity | null> {
    return this.owners.get(id) ?? null;
  }

  public async FindByCode(ownerCode: string): Promise<OwnerEntity | null> {
    return [...this.owners.values()].find((owner) => owner.OwnerCode === ownerCode) ?? null;
  }

  public async Create(owner: OwnerEntity): Promise<OwnerEntity> {
    this.owners.set(owner.Id, owner);
    return owner;
  }

  public async Update(owner: OwnerEntity): Promise<OwnerEntity> {
    this.owners.set(owner.Id, owner);
    return owner;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: OwnerListFilter = {},
  ): Promise<{ Items: OwnerEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.owners.values()];
    if (filter.Status) items = items.filter((owner) => owner.Status === filter.Status);
    return { Items: items, TotalItems: items.length };
  }
}

export class MemoryUomRepository implements IUomRepository {
  public readonly uoms: Map<string, UomEntity>;

  constructor(uoms: UomEntity[] = [MakeUom()]) {
    this.uoms = new Map(uoms.map((uom) => [uom.Id, uom]));
  }

  public async FindById(id: string): Promise<UomEntity | null> {
    return this.uoms.get(id) ?? null;
  }

  public async FindByCode(uomCode: string): Promise<UomEntity | null> {
    return [...this.uoms.values()].find((uom) => uom.UomCode === uomCode) ?? null;
  }

  public async Create(uom: UomEntity): Promise<UomEntity> {
    this.uoms.set(uom.Id, uom);
    return uom;
  }

  public async Update(uom: UomEntity): Promise<UomEntity> {
    this.uoms.set(uom.Id, uom);
    return uom;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: UomListFilter = {},
  ): Promise<{ Items: UomEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.uoms.values()];
    if (filter.Status) items = items.filter((uom) => uom.Status === filter.Status);
    return { Items: items, TotalItems: items.length };
  }
}

export class MemorySkuRepository implements ISkuRepository {
  public readonly skus: Map<string, SkuEntity>;

  constructor(skus: SkuEntity[] = [MakeSku()]) {
    this.skus = new Map(skus.map((sku) => [sku.Id, sku]));
  }

  public async FindById(id: string): Promise<SkuEntity | null> {
    return this.skus.get(id) ?? null;
  }

  public async FindByCode(skuCode: string): Promise<SkuEntity | null> {
    return [...this.skus.values()].find((sku) => sku.SkuCode === skuCode) ?? null;
  }

  public async Create(sku: SkuEntity): Promise<SkuEntity> {
    this.skus.set(sku.Id, sku);
    return sku;
  }

  public async Update(sku: SkuEntity): Promise<SkuEntity> {
    this.skus.set(sku.Id, sku);
    return sku;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: SkuListFilter = {},
  ): Promise<{ Items: SkuEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.skus.values()];
    if (filter.ItemStatus) items = items.filter((sku) => sku.ItemStatus === filter.ItemStatus);
    return { Items: items, TotalItems: items.length };
  }
}

export class MemoryWarehouseRepository implements IWarehouseRepository {
  public readonly warehouses: Map<string, WarehouseEntity>;

  constructor(warehouses: WarehouseEntity[] = [MakeWarehouse()]) {
    this.warehouses = new Map(warehouses.map((warehouse) => [warehouse.Id, warehouse]));
  }

  public async FindById(id: string): Promise<WarehouseEntity | null> {
    return this.warehouses.get(id) ?? null;
  }

  public async FindByCode(warehouseCode: string): Promise<WarehouseEntity | null> {
    return [...this.warehouses.values()].find((warehouse) => warehouse.WarehouseCode === warehouseCode) ?? null;
  }

  public async Create(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }

  public async Update(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: WarehouseListFilter = {},
  ): Promise<{ Items: WarehouseEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.warehouses.values()];
    if (filter.Status) items = items.filter((warehouse) => warehouse.Status === filter.Status);
    return { Items: items, TotalItems: items.length };
  }
}

export class MemoryLocationRepository implements ILocationRepository {
  public readonly locations: Map<string, LocationEntity>;

  constructor(locations: LocationEntity[] = [MakeLocation()]) {
    this.locations = new Map(locations.map((location) => [location.Id, location]));
  }

  public async FindById(id: string): Promise<LocationEntity | null> {
    return this.locations.get(id) ?? null;
  }

  public async FindByWarehouseAndCode(warehouseId: string, locationCode: string): Promise<LocationEntity | null> {
    return (
      [...this.locations.values()].find(
        (location) => location.WarehouseId === warehouseId && location.LocationCode === locationCode,
      ) ?? null
    );
  }

  public async Create(location: LocationEntity): Promise<LocationEntity> {
    this.locations.set(location.Id, location);
    return location;
  }

  public async Update(location: LocationEntity): Promise<LocationEntity> {
    this.locations.set(location.Id, location);
    return location;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: LocationListFilter = {},
  ): Promise<{ Items: LocationEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.locations.values()];
    if (filter.WarehouseId) items = items.filter((location) => location.WarehouseId === filter.WarehouseId);
    return { Items: items, TotalItems: items.length };
  }

  public async ListForTree(warehouseId: string): Promise<LocationEntity[]> {
    return [...this.locations.values()].filter((location) => location.WarehouseId === warehouseId);
  }
}

export class MemoryInventoryStatusRepository implements IInventoryStatusRepository {
  public readonly statuses: Map<string, InventoryStatusEntity>;

  constructor(statuses: InventoryStatusEntity[] = [MakeInventoryStatus()]) {
    this.statuses = new Map(statuses.map((status) => [status.Id, status]));
  }

  public async FindById(id: string): Promise<InventoryStatusEntity | null> {
    return this.statuses.get(id) ?? null;
  }

  public async FindByCode(statusCode: string): Promise<InventoryStatusEntity | null> {
    return [...this.statuses.values()].find((status) => status.StatusCode === statusCode) ?? null;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: InventoryStatusListFilter = {},
  ): Promise<{ Items: InventoryStatusEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.statuses.values()];
    if (filter.Status) items = items.filter((status) => status.Status === filter.Status);
    if (filter.StageGroup) items = items.filter((status) => status.StageGroup === filter.StageGroup);
    return { Items: items, TotalItems: items.length };
  }
}

export class MemoryInventoryDimensionRepository implements IInventoryDimensionRepository {
  public readonly dimensions = new Map<string, InventoryDimensionEntity>();

  public async FindById(id: string): Promise<InventoryDimensionEntity | null> {
    return this.dimensions.get(id) ?? null;
  }

  public async FindByHash(dimensionKeyHash: string): Promise<InventoryDimensionEntity | null> {
    return [...this.dimensions.values()].find((dimension) => dimension.DimensionKeyHash === dimensionKeyHash) ?? null;
  }

  public async Create(dimension: InventoryDimensionEntity): Promise<InventoryDimensionEntity> {
    this.dimensions.set(dimension.Id, dimension);
    return dimension;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: InventoryDimensionListFilter = {},
  ): Promise<{ Items: InventoryDimensionEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.dimensions.values()];
    if (filter.OwnerId) items = items.filter((dimension) => dimension.OwnerId === filter.OwnerId);
    if (filter.SkuId) items = items.filter((dimension) => dimension.SkuId === filter.SkuId);
    return { Items: items, TotalItems: items.length };
  }
}

export class MemoryInventoryBalanceRepository implements IInventoryBalanceRepository {
  public readonly balances = new Map<string, InventoryBalanceEntity>();

  public async FindById(id: string): Promise<InventoryBalanceEntity | null> {
    return this.balances.get(id) ?? null;
  }

  public async FindByDimensionId(dimensionId: string): Promise<InventoryBalanceEntity | null> {
    return [...this.balances.values()].find((balance) => balance.DimensionId === dimensionId) ?? null;
  }

  public async Create(balance: InventoryBalanceEntity): Promise<InventoryBalanceEntity> {
    this.balances.set(balance.Id, balance);
    return balance;
  }

  public async List(
    _skip = 0,
    _take = 50,
    filter: InventoryBalanceListFilter = {},
  ): Promise<{ Items: InventoryBalanceEntity[]; TotalItems: number }> {
    void _skip;
    void _take;
    let items = [...this.balances.values()];
    if (filter.DimensionId) items = items.filter((balance) => balance.DimensionId === filter.DimensionId);
    return { Items: items, TotalItems: items.length };
  }
}
