import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
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

const Warehouse = (status: MasterDataStatus) =>
  new WarehouseEntity({
    Id: 'warehouse-1',
    SiteId: 'site-1',
    WarehouseCode: 'WH-HCM',
    WarehouseName: 'Ho Chi Minh DC',
    WarehouseTypeCode: 'DC',
    Status: status,
    Timezone: 'Asia/Ho_Chi_Minh',
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Zone = () =>
  new ZoneEntity({
    Id: 'zone-existing',
    WarehouseId: 'warehouse-1',
    ZoneCode: 'PICK',
    ZoneName: 'Picking Zone',
    ZoneType: 'PICKING',
    Status: MasterDataStatus.Active,
    Sequence: 10,
    TemperatureClass: null,
    ComplianceFlags: {},
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

describe('CreateZoneUseCase', () => {
  it('creates Zone when parent Warehouse is active and ZoneCode is unique in warehouse', async () => {
    const warehouses = new FakeWarehouseRepository();
    const zones = new FakeZoneRepository();
    warehouses.FindById.mockResolvedValue(Warehouse(MasterDataStatus.Active));
    zones.FindByWarehouseAndCode.mockResolvedValue(null);
    zones.Create.mockImplementation(async (zone) => zone);

    const useCase = new CreateZoneUseCase(zones, warehouses);
    const created = await useCase.Execute({
      WarehouseId: 'warehouse-1',
      ZoneCode: 'PICK',
      ZoneName: 'Picking Zone',
      ZoneType: 'PICKING',
      Status: MasterDataStatus.Active,
      Sequence: 10,
      ComplianceFlags: { Hazmat: false },
    });

    expect(warehouses.FindById).toHaveBeenCalledWith('warehouse-1');
    expect(zones.FindByWarehouseAndCode).toHaveBeenCalledWith('warehouse-1', 'PICK');
    expect(created.WarehouseId).toBe('warehouse-1');
    expect(created.ComplianceFlags).toEqual({ Hazmat: false });
  });

  it('throws NotFoundException when WarehouseId does not exist', async () => {
    const warehouses = new FakeWarehouseRepository();
    const zones = new FakeZoneRepository();
    warehouses.FindById.mockResolvedValue(null);

    const useCase = new CreateZoneUseCase(zones, warehouses);

    await expect(
      useCase.Execute({
        WarehouseId: 'missing-warehouse',
        ZoneCode: 'PICK',
        ZoneName: 'Picking Zone',
        ZoneType: 'PICKING',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BusinessRuleException when parent Warehouse is inactive', async () => {
    const warehouses = new FakeWarehouseRepository();
    const zones = new FakeZoneRepository();
    warehouses.FindById.mockResolvedValue(Warehouse(MasterDataStatus.Inactive));

    const useCase = new CreateZoneUseCase(zones, warehouses);

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneCode: 'PICK',
        ZoneName: 'Picking Zone',
        ZoneType: 'PICKING',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws ConflictException when ZoneCode already exists in the same warehouse', async () => {
    const warehouses = new FakeWarehouseRepository();
    const zones = new FakeZoneRepository();
    warehouses.FindById.mockResolvedValue(Warehouse(MasterDataStatus.Active));
    zones.FindByWarehouseAndCode.mockResolvedValue(Zone());

    const useCase = new CreateZoneUseCase(zones, warehouses);

    await expect(
      useCase.Execute({
        WarehouseId: 'warehouse-1',
        ZoneCode: 'PICK',
        ZoneName: 'Picking Zone',
        ZoneType: 'PICKING',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
