import { ConflictException } from '@common/Exceptions/AppException';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import {
  IWarehouseProfileRepository,
  WarehouseProfileListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import {
  IWarehouseProfileAssignmentRepository,
  WarehouseProfileAssignmentListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileAssignmentRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileAssignmentEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignmentEntity';

const Now = new Date('2026-01-01T00:00:00.000Z');

export class InMemoryWarehouseProfileRepository implements IWarehouseProfileRepository {
  private readonly profiles = new Map<string, WarehouseProfileEntity>();

  public async FindById(id: string): Promise<WarehouseProfileEntity | null> {
    return this.profiles.get(id) ?? null;
  }

  public async FindByCode(profileCode: string): Promise<WarehouseProfileEntity | null> {
    return [...this.profiles.values()].find((profile) => profile.ProfileCode === profileCode) ?? null;
  }

  public async Create(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    if ([...this.profiles.values()].some((existing) => existing.ProfileCode === profile.ProfileCode)) {
      throw new ConflictException('Warehouse profile code already exists');
    }
    this.profiles.set(profile.Id, profile);
    return profile;
  }

  public async Update(profile: WarehouseProfileEntity): Promise<WarehouseProfileEntity> {
    this.profiles.set(profile.Id, profile);
    return profile;
  }

  public async List(
    skip: number,
    take: number,
    filter: WarehouseProfileListFilter = {},
  ): Promise<{ Items: WarehouseProfileEntity[]; TotalItems: number }> {
    let items = [...this.profiles.values()];
    if (filter.Status) items = items.filter((profile) => profile.Status === filter.Status);
    if (filter.WarehouseTypeCode)
      items = items.filter((profile) => profile.WarehouseTypeCode === filter.WarehouseTypeCode);
    if (filter.WarehouseId) items = items.filter((profile) => profile.WarehouseId === filter.WarehouseId);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class InMemoryWarehouseProfileAssignmentRepository implements IWarehouseProfileAssignmentRepository {
  private readonly assignments = new Map<string, WarehouseProfileAssignmentEntity>();

  public async FindById(id: string): Promise<WarehouseProfileAssignmentEntity | null> {
    return this.assignments.get(id) ?? null;
  }

  public async Create(assignment: WarehouseProfileAssignmentEntity): Promise<WarehouseProfileAssignmentEntity> {
    this.assignments.set(assignment.Id, assignment);
    return assignment;
  }

  public async ListByProfile(
    warehouseProfileId: string,
    skip: number,
    take: number,
    filter: WarehouseProfileAssignmentListFilter = {},
  ): Promise<{ Items: WarehouseProfileAssignmentEntity[]; TotalItems: number }> {
    let items = [...this.assignments.values()].filter(
      (assignment) => assignment.WarehouseProfileId === warehouseProfileId,
    );
    if (filter.AssignmentType) {
      items = items.filter((assignment) => assignment.AssignmentType === filter.AssignmentType);
    }
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class MasterDataReferenceStub {
  private readonly warehouses = new Map<string, WarehouseEntity>();
  private readonly zones = new Map<string, ZoneEntity>();
  private readonly owners = new Map<string, OwnerEntity>();
  private readonly skus = new Map<string, SkuEntity>();

  public AddWarehouse(id: string, status: MasterDataStatus): void {
    this.warehouses.set(
      id,
      new WarehouseEntity({
        Id: id,
        SiteId: 'site-1',
        WarehouseCode: `WH-${id}`,
        WarehouseName: `Warehouse ${id}`,
        WarehouseTypeCode: 'TIER_1',
        Status: status,
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    );
  }

  public AddZone(id: string, status: MasterDataStatus): void {
    this.zones.set(
      id,
      new ZoneEntity({
        Id: id,
        WarehouseId: 'warehouse-1',
        ZoneCode: `ZN-${id}`,
        ZoneName: `Zone ${id}`,
        ZoneType: 'PICKING',
        Status: status,
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    );
  }

  public AddOwner(id: string, status: MasterDataStatus): void {
    this.owners.set(
      id,
      new OwnerEntity({
        Id: id,
        OwnerCode: `OW-${id}`,
        OwnerName: `Owner ${id}`,
        Status: status,
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    );
  }

  public AddSku(id: string, active: boolean): void {
    this.skus.set(
      id,
      new SkuEntity({
        Id: id,
        SkuCode: `SK-${id}`,
        SkuName: `Sku ${id}`,
        ItemClass: 'DRY',
        ItemStatus: active ? SkuStatus.Active : SkuStatus.Blocked,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
        CreatedAt: Now,
        UpdatedAt: Now,
      }),
    );
  }

  public readonly Warehouses: IWarehouseRepository = {
    FindById: async (id: string) => this.warehouses.get(id) ?? null,
    FindByCode: async () => null,
    Create: async (warehouse: WarehouseEntity) => warehouse,
    Update: async (warehouse: WarehouseEntity) => warehouse,
    List: async () => ({ Items: [...this.warehouses.values()], TotalItems: this.warehouses.size }),
  };

  public readonly Zones: IZoneRepository = {
    FindById: async (id: string) => this.zones.get(id) ?? null,
    FindByWarehouseAndCode: async () => null,
    Create: async (zone: ZoneEntity) => zone,
    Update: async (zone: ZoneEntity) => zone,
    List: async () => ({ Items: [...this.zones.values()], TotalItems: this.zones.size }),
  };

  public readonly Owners: IOwnerRepository = {
    FindById: async (id: string) => this.owners.get(id) ?? null,
    FindByCode: async () => null,
    Create: async (owner: OwnerEntity) => owner,
    Update: async (owner: OwnerEntity) => owner,
    List: async () => ({ Items: [...this.owners.values()], TotalItems: this.owners.size }),
  };

  public readonly Skus: ISkuRepository = {
    FindById: async (id: string) => this.skus.get(id) ?? null,
    FindByCode: async () => null,
    Create: async (sku: SkuEntity) => sku,
    Update: async (sku: SkuEntity) => sku,
    List: async () => ({ Items: [...this.skus.values()], TotalItems: this.skus.size }),
  };
}
