import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateLocationUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationUseCase';
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
  public FindByPhysicalAddress = jest.fn<
    Promise<LocationEntity | null>,
    [string, string, { AisleCode: string; RackCode: string; LevelCode: string; BinCode: string }]
  >();
  public Create = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public Update = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public List = jest.fn<Promise<{ Items: LocationEntity[]; TotalItems: number }>, [number, number, unknown?]>();
  public ListForTree = jest.fn<Promise<LocationEntity[]>, [string, string?]>();
}

const Warehouse = (id = 'warehouse-1', status = MasterDataStatus.Active) =>
  new WarehouseEntity({
    Id: id,
    SiteId: 'site-1',
    WarehouseCode: id,
    WarehouseName: id,
    WarehouseTypeCode: 'DC',
    Status: status,
    Timezone: null,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Zone = (warehouseId = 'warehouse-1') =>
  new ZoneEntity({
    Id: 'zone-1',
    WarehouseId: warehouseId,
    ZoneCode: 'PICK',
    ZoneName: 'Picking',
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

const buildUseCase = () => {
  const warehouses = new FakeWarehouseRepository();
  const zones = new FakeZoneRepository();
  const profiles = new FakeLocationProfileRepository();
  const locations = new FakeLocationRepository();
  return {
    warehouses,
    zones,
    profiles,
    locations,
    useCase: new CreateLocationUseCase(locations, profiles, warehouses, zones),
  };
};

describe('CreateLocationUseCase', () => {
  it('creates a Location when warehouse, zone and active profile are valid', async () => {
    const { warehouses, zones, profiles, locations, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse());
    zones.FindById.mockResolvedValue(Zone());
    profiles.FindById.mockResolvedValue(Profile({ CapacityPolicy: { RequireCapacityQty: true } }));
    locations.FindByWarehouseAndCode.mockResolvedValue(null);
    locations.FindByPhysicalAddress.mockResolvedValue(null);
    locations.Create.mockImplementation(async (location) => location);

    const created = await useCase.Execute({
      WarehouseId: 'warehouse-1',
      ZoneId: 'zone-1',
      LocationProfileId: 'profile-1',
      LocationCode: 'BIN-001',
      LocationName: 'Bin 001',
      LocationType: 'BIN',
      LocationStatus: LocationStatus.Active,
      CapacityQty: 100,
      AisleCode: ' a01 ',
      RackCode: 'r01',
      LevelCode: 'l01',
      BinCode: 'b01',
      TemperatureClass: 'AMBIENT',
      BondedFlag: false,
    });

    expect(locations.FindByWarehouseAndCode).toHaveBeenCalledWith('warehouse-1', 'BIN-001');
    expect(locations.FindByPhysicalAddress).toHaveBeenCalledWith('warehouse-1', 'zone-1', {
      AisleCode: 'A01',
      RackCode: 'R01',
      LevelCode: 'L01',
      BinCode: 'B01',
    });
    expect(created.LocationCode).toBe('BIN-001');
    expect(created.AisleCode).toBe('A01');
    expect(created.RackCode).toBe('R01');
    expect(created.LevelCode).toBe('L01');
    expect(created.BinCode).toBe('B01');
    expect(created.CapacityQty).toBe(100);
  });

  it('normalizes blank physical address fields to null and skips duplicate guard when incomplete', async () => {
    const { warehouses, zones, profiles, locations, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse());
    zones.FindById.mockResolvedValue(Zone());
    profiles.FindById.mockResolvedValue(Profile());
    locations.FindByWarehouseAndCode.mockResolvedValue(null);
    locations.Create.mockImplementation(async (location) => location);

    const created = await useCase.Execute({
      WarehouseId: 'warehouse-1',
      ZoneId: 'zone-1',
      LocationProfileId: 'profile-1',
      LocationCode: 'BIN-001',
      LocationName: 'Bin 001',
      LocationType: 'BIN',
      LocationStatus: LocationStatus.Active,
      AisleCode: ' A01 ',
      RackCode: '',
      LevelCode: '   ',
      BinCode: null,
    });

    expect(locations.FindByPhysicalAddress).not.toHaveBeenCalled();
    expect(created.AisleCode).toBe('A01');
    expect(created.RackCode).toBeNull();
    expect(created.LevelCode).toBeNull();
    expect(created.BinCode).toBeNull();
  });

  it('throws ConflictException when a complete physical address already exists in the same warehouse and zone', async () => {
    const { warehouses, zones, profiles, locations, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse());
    zones.FindById.mockResolvedValue(Zone());
    profiles.FindById.mockResolvedValue(Profile());
    locations.FindByWarehouseAndCode.mockResolvedValue(null);
    locations.FindByPhysicalAddress.mockResolvedValue({ Id: 'location-existing' } as LocationEntity);

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
        AisleCode: 'A01',
        RackCode: 'R01',
        LevelCode: 'L01',
        BinCode: 'B01',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(locations.Create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when warehouse, zone or profile is missing', async () => {
    const { warehouses, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        WarehouseId: 'missing-warehouse',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when location profile is missing', async () => {
    const { warehouses, zones, profiles, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse());
    zones.FindById.mockResolvedValue(Zone());
    profiles.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'missing-profile',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BusinessRuleException when zone does not belong to the target warehouse', async () => {
    const { warehouses, zones, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse('warehouse-1'));
    zones.FindById.mockResolvedValue(Zone('warehouse-2'));

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws ConflictException when LocationCode already exists in the same warehouse', async () => {
    const { warehouses, zones, profiles, locations, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse());
    zones.FindById.mockResolvedValue(Zone());
    profiles.FindById.mockResolvedValue(Profile());
    locations.FindByWarehouseAndCode.mockResolvedValue({ Id: 'location-existing' } as LocationEntity);

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws BusinessRuleException when parent id is an empty string', async () => {
    const { warehouses, zones, profiles, locations, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse());
    zones.FindById.mockResolvedValue(Zone());
    profiles.FindById.mockResolvedValue(Profile());
    locations.FindByWarehouseAndCode.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        ParentLocationId: '',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(locations.Create).not.toHaveBeenCalled();
  });

  it('throws BusinessRuleException when profile is inactive or type does not match location', async () => {
    const { warehouses, zones, profiles, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse());
    zones.FindById.mockResolvedValue(Zone());
    profiles.FindById.mockResolvedValue(Profile({ Status: MasterDataStatus.Inactive }));

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    profiles.FindById.mockResolvedValue(Profile({ LocationType: 'RACK' }));

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-002',
        LocationName: 'Bin 002',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('allows the same LocationCode in a different warehouse', async () => {
    const { warehouses, zones, profiles, locations, useCase } = buildUseCase();
    warehouses.FindById.mockResolvedValue(Warehouse('warehouse-2'));
    zones.FindById.mockResolvedValue(Zone('warehouse-2'));
    profiles.FindById.mockResolvedValue(Profile());
    locations.FindByWarehouseAndCode.mockResolvedValue(null);
    locations.Create.mockImplementation(async (location) => location);

    await useCase.Execute({
      WarehouseId: 'warehouse-2',
      ZoneId: 'zone-1',
      LocationProfileId: 'profile-1',
      LocationCode: 'BIN-001',
      LocationName: 'Bin 001',
      LocationType: 'BIN',
      LocationStatus: LocationStatus.Active,
    });

    expect(locations.FindByWarehouseAndCode).toHaveBeenCalledWith('warehouse-2', 'BIN-001');
  });
});
