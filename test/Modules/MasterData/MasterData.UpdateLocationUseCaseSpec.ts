import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UpdateLocationUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationUseCase';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

class FakeWarehouseRepository implements IWarehouseRepository {
  public FindById = jest.fn<Promise<WarehouseEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<WarehouseEntity | null>, [string]>();
  public Create = jest.fn<Promise<WarehouseEntity>, [WarehouseEntity]>();
  public Update = jest.fn<Promise<WarehouseEntity>, [WarehouseEntity]>();
  public List = jest.fn<Promise<{ Items: WarehouseEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeZoneRepository implements IZoneRepository {
  public FindById = jest.fn<Promise<ZoneEntity | null>, [string]>();
  public FindByWarehouseAndCode = jest.fn<Promise<ZoneEntity | null>, [string, string]>();
  public Create = jest.fn<Promise<ZoneEntity>, [ZoneEntity]>();
  public Update = jest.fn<Promise<ZoneEntity>, [ZoneEntity]>();
  public List = jest.fn<Promise<{ Items: ZoneEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeLocationProfileRepository implements ILocationProfileRepository {
  public FindById = jest.fn<Promise<LocationProfileEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<LocationProfileEntity | null>, [string]>();
  public Create = jest.fn<Promise<LocationProfileEntity>, [LocationProfileEntity]>();
  public Update = jest.fn<Promise<LocationProfileEntity>, [LocationProfileEntity]>();
  public List = jest.fn<Promise<{ Items: LocationProfileEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeLocationRepository implements ILocationRepository {
  public FindById = jest.fn<Promise<LocationEntity | null>, [string]>();
  public FindByWarehouseAndCode = jest.fn<Promise<LocationEntity | null>, [string, string]>();
  public Create = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public Update = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public List = jest.fn<Promise<{ Items: LocationEntity[]; TotalItems: number }>, [number, number, unknown?]>();
  public ListForTree = jest.fn<Promise<LocationEntity[]>, [string, string?]>();
}

const Location = (overrides: Partial<LocationEntity> = {}) =>
  new LocationEntity({
    Id: overrides.Id ?? 'location-1',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-1',
    ZoneId: overrides.ZoneId ?? 'zone-1',
    ParentLocationId: overrides.ParentLocationId ?? null,
    LocationCode: overrides.LocationCode ?? 'BIN-001',
    LocationName: overrides.LocationName ?? 'Bin 001',
    LocationType: overrides.LocationType ?? 'BIN',
    LocationProfileId: overrides.LocationProfileId ?? 'profile-1',
    LocationStatus: overrides.LocationStatus ?? LocationStatus.Active,
    CapacityQty: overrides.CapacityQty ?? null,
    CapacityVolume: overrides.CapacityVolume ?? null,
    CapacityWeight: overrides.CapacityWeight ?? null,
    PalletSlot: overrides.PalletSlot ?? null,
    TemperatureClass: overrides.TemperatureClass ?? null,
    DgCompatibilityGroup: overrides.DgCompatibilityGroup ?? null,
    BondedFlag: overrides.BondedFlag ?? false,
    OwnerRestriction: overrides.OwnerRestriction ?? null,
    MixSkuPolicy: overrides.MixSkuPolicy ?? null,
    MixLotPolicy: overrides.MixLotPolicy ?? null,
    MixOwnerPolicy: overrides.MixOwnerPolicy ?? null,
    PickSequence: overrides.PickSequence ?? null,
    PutawaySequence: overrides.PutawaySequence ?? null,
    SourceSystem: overrides.SourceSystem ?? null,
    ReferenceId: overrides.ReferenceId ?? null,
    CreatedAt: overrides.CreatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: overrides.UpdatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: overrides.CreatedBy ?? null,
    UpdatedBy: overrides.UpdatedBy ?? null,
  });

const Profile = (overrides: Partial<LocationProfileEntity> = {}) =>
  new LocationProfileEntity({
    Id: overrides.Id ?? 'profile-1',
    ProfileCode: overrides.ProfileCode ?? 'BIN-DRY',
    ProfileName: overrides.ProfileName ?? 'Dry Bin',
    LocationType: overrides.LocationType ?? 'BIN',
    Version: overrides.Version ?? 1,
    Status: overrides.Status ?? MasterDataStatus.Active,
    CapacityPolicy: overrides.CapacityPolicy ?? {},
    EligibilityPolicy: overrides.EligibilityPolicy ?? {},
    MixPolicy: overrides.MixPolicy ?? {},
    CompliancePolicy: overrides.CompliancePolicy ?? {},
    OperationPolicy: overrides.OperationPolicy ?? {},
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Warehouse = (id = 'warehouse-1') =>
  new WarehouseEntity({
    Id: id,
    SiteId: 'site-1',
    WarehouseCode: id,
    WarehouseName: id,
    WarehouseTypeCode: 'DC',
    Status: MasterDataStatus.Active,
    Timezone: null,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Zone = (id = 'zone-1', warehouseId = 'warehouse-1') =>
  new ZoneEntity({
    Id: id,
    WarehouseId: warehouseId,
    ZoneCode: id,
    ZoneName: id,
    ZoneType: 'PICKING',
    Status: MasterDataStatus.Active,
    Sequence: null,
    TemperatureClass: null,
    ComplianceFlags: {},
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const buildUseCase = () => {
  const warehouses = new FakeWarehouseRepository();
  const zones = new FakeZoneRepository();
  const profiles = new FakeLocationProfileRepository();
  const locations = new FakeLocationRepository();
  warehouses.FindById.mockResolvedValue(Warehouse());
  zones.FindById.mockResolvedValue(Zone());
  profiles.FindById.mockResolvedValue(Profile());
  locations.Update.mockImplementation(async (location) => location);
  return {
    warehouses,
    zones,
    profiles,
    locations,
    useCase: new UpdateLocationUseCase(locations, profiles, warehouses, zones),
  };
};

describe('UpdateLocationUseCase', () => {
  it('throws NotFoundException when updating a missing location', async () => {
    const { locations, useCase } = buildUseCase();
    locations.FindById.mockResolvedValue(null);

    await expect(useCase.Execute({ Id: 'missing-location', LocationName: 'Missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ConflictException when updating LocationCode to a duplicate in the target warehouse', async () => {
    const { locations, useCase } = buildUseCase();
    locations.FindById.mockResolvedValue(Location({ Id: 'location-1', LocationCode: 'BIN-001' }));
    locations.FindByWarehouseAndCode.mockResolvedValue(Location({ Id: 'location-2', LocationCode: 'BIN-002' }));

    await expect(useCase.Execute({ Id: 'location-1', LocationCode: 'BIN-002' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws BusinessRuleException when parent is the same location', async () => {
    const { locations, useCase } = buildUseCase();
    locations.FindById.mockResolvedValue(Location({ Id: 'location-1' }));

    await expect(useCase.Execute({ Id: 'location-1', ParentLocationId: 'location-1' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('throws BusinessRuleException when parent belongs to another warehouse or zone', async () => {
    const { locations, useCase } = buildUseCase();
    const current = Location({ Id: 'location-1', WarehouseId: 'warehouse-1', ZoneId: 'zone-1' });
    const crossWarehouseParent = Location({
      Id: 'parent-1',
      WarehouseId: 'warehouse-2',
      ZoneId: 'zone-1',
      ParentLocationId: null,
    });
    locations.FindById.mockImplementation(async (id) => {
      if (id === 'location-1') return current;
      if (id === 'parent-1') return crossWarehouseParent;
      return null;
    });

    await expect(useCase.Execute({ Id: 'location-1', ParentLocationId: 'parent-1' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );

    const crossZoneParent = Location({
      Id: 'parent-2',
      WarehouseId: 'warehouse-1',
      ZoneId: 'zone-2',
      ParentLocationId: null,
    });
    locations.FindById.mockImplementation(async (id) => {
      if (id === 'location-1') return current;
      if (id === 'parent-2') return crossZoneParent;
      return null;
    });

    await expect(useCase.Execute({ Id: 'location-1', ParentLocationId: 'parent-2' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('throws BusinessRuleException when parent is a descendant of the current location', async () => {
    const { locations, useCase } = buildUseCase();
    const current = Location({ Id: 'location-1', ParentLocationId: null });
    const child = Location({ Id: 'child-1', ParentLocationId: 'location-1' });
    const grandChild = Location({ Id: 'grand-child-1', ParentLocationId: 'child-1' });
    locations.FindById.mockImplementation(async (id) => {
      if (id === 'location-1') return current;
      if (id === 'child-1') return child;
      if (id === 'grand-child-1') return grandChild;
      return null;
    });

    await expect(useCase.Execute({ Id: 'location-1', ParentLocationId: 'grand-child-1' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('enforces active profile policy constraints when updating location attributes', async () => {
    const { locations, profiles, useCase } = buildUseCase();
    locations.FindById.mockResolvedValue(Location({ Id: 'location-1', CapacityQty: null }));
    profiles.FindById.mockResolvedValue(
      Profile({
        CapacityPolicy: { RequireCapacityQty: true },
        CompliancePolicy: { RequiredTemperatureClass: 'COLD', BondedOnly: true },
      }),
    );

    await expect(
      useCase.Execute({
        Id: 'location-1',
        LocationProfileId: 'profile-1',
        TemperatureClass: 'AMBIENT',
        BondedFlag: false,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });
});
