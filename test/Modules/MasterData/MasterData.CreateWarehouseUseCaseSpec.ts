import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

class FakeSiteRepository implements ISiteRepository {
  public FindById = jest.fn<Promise<SiteEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<SiteEntity | null>, [string]>();
  public Create = jest.fn<Promise<SiteEntity>, [SiteEntity]>();
  public Update = jest.fn<Promise<SiteEntity>, [SiteEntity]>();
  public List = jest.fn<Promise<{ Items: SiteEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeWarehouseRepository implements IWarehouseRepository {
  public FindById = jest.fn<Promise<WarehouseEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<WarehouseEntity | null>, [string]>();
  public Create = jest.fn<Promise<WarehouseEntity>, [WarehouseEntity]>();
  public Update = jest.fn<Promise<WarehouseEntity>, [WarehouseEntity]>();
  public List = jest.fn<Promise<{ Items: WarehouseEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Site = (status: MasterDataStatus) =>
  new SiteEntity({
    Id: 'site-1',
    SiteCode: 'SITE-HCM',
    SiteName: 'Ho Chi Minh Site',
    Status: status,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Warehouse = () =>
  new WarehouseEntity({
    Id: 'warehouse-existing',
    SiteId: 'site-1',
    WarehouseCode: 'WH-HCM',
    WarehouseName: 'Existing Warehouse',
    WarehouseTypeCode: 'DC',
    Status: MasterDataStatus.Active,
    Timezone: 'Asia/Ho_Chi_Minh',
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

describe('CreateWarehouseUseCase', () => {
  it('creates Warehouse when parent Site is active and WarehouseCode is unique', async () => {
    const sites = new FakeSiteRepository();
    const warehouses = new FakeWarehouseRepository();
    sites.FindById.mockResolvedValue(Site(MasterDataStatus.Active));
    warehouses.FindByCode.mockResolvedValue(null);
    warehouses.Create.mockImplementation(async (warehouse) => warehouse);

    const useCase = new CreateWarehouseUseCase(warehouses, sites);
    const created = await useCase.Execute({
      SiteId: 'site-1',
      WarehouseCode: 'WH-HCM',
      WarehouseName: 'Ho Chi Minh DC',
      WarehouseTypeCode: 'DC',
      Status: MasterDataStatus.Active,
      Timezone: 'Asia/Ho_Chi_Minh',
    });

    expect(sites.FindById).toHaveBeenCalledWith('site-1');
    expect(warehouses.FindByCode).toHaveBeenCalledWith('WH-HCM');
    expect(created.SiteId).toBe('site-1');
    expect(created.WarehouseCode).toBe('WH-HCM');
  });

  it('throws NotFoundException when SiteId does not exist', async () => {
    const sites = new FakeSiteRepository();
    const warehouses = new FakeWarehouseRepository();
    sites.FindById.mockResolvedValue(null);

    const useCase = new CreateWarehouseUseCase(warehouses, sites);

    await expect(
      useCase.Execute({
        SiteId: 'missing-site',
        WarehouseCode: 'WH-HCM',
        WarehouseName: 'Ho Chi Minh DC',
        WarehouseTypeCode: 'DC',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BusinessRuleException when parent Site is inactive', async () => {
    const sites = new FakeSiteRepository();
    const warehouses = new FakeWarehouseRepository();
    sites.FindById.mockResolvedValue(Site(MasterDataStatus.Inactive));

    const useCase = new CreateWarehouseUseCase(warehouses, sites);

    await expect(
      useCase.Execute({
        SiteId: 'site-1',
        WarehouseCode: 'WH-HCM',
        WarehouseName: 'Ho Chi Minh DC',
        WarehouseTypeCode: 'DC',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws ConflictException when WarehouseCode already exists', async () => {
    const sites = new FakeSiteRepository();
    const warehouses = new FakeWarehouseRepository();
    sites.FindById.mockResolvedValue(Site(MasterDataStatus.Active));
    warehouses.FindByCode.mockResolvedValue(Warehouse());

    const useCase = new CreateWarehouseUseCase(warehouses, sites);

    await expect(
      useCase.Execute({
        SiteId: 'site-1',
        WarehouseCode: 'WH-HCM',
        WarehouseName: 'Ho Chi Minh DC',
        WarehouseTypeCode: 'DC',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
