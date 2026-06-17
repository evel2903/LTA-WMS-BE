import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UpdateSiteUseCase } from '@modules/MasterData/Application/UseCases/UpdateSiteUseCase';
import { UpdateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseUseCase';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
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

class FakeZoneRepository implements IZoneRepository {
  public FindById = jest.fn<Promise<ZoneEntity | null>, [string]>();
  public FindByWarehouseAndCode = jest.fn<Promise<ZoneEntity | null>, [string, string]>();
  public Create = jest.fn<Promise<ZoneEntity>, [ZoneEntity]>();
  public Update = jest.fn<Promise<ZoneEntity>, [ZoneEntity]>();
  public List = jest.fn<Promise<{ Items: ZoneEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Site = (id: string, siteCode: string, status = MasterDataStatus.Active) =>
  new SiteEntity({
    Id: id,
    SiteCode: siteCode,
    SiteName: siteCode,
    Status: status,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Warehouse = (id: string, siteId: string, warehouseCode: string, status = MasterDataStatus.Active) =>
  new WarehouseEntity({
    Id: id,
    SiteId: siteId,
    WarehouseCode: warehouseCode,
    WarehouseName: warehouseCode,
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

const Zone = (id: string, warehouseId: string, zoneCode: string) =>
  new ZoneEntity({
    Id: id,
    WarehouseId: warehouseId,
    ZoneCode: zoneCode,
    ZoneName: zoneCode,
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

describe('MasterData update use cases', () => {
  it('updates Site and preserves omitted fields', async () => {
    const sites = new FakeSiteRepository();
    sites.FindById.mockResolvedValue(Site('site-1', 'SITE-HCM'));
    sites.Update.mockImplementation(async (site) => site);

    const useCase = new UpdateSiteUseCase(sites);
    const updated = await useCase.Execute({ Id: 'site-1', SiteName: 'HCM Updated' });

    expect(updated.SiteCode).toBe('SITE-HCM');
    expect(updated.SiteName).toBe('HCM Updated');
  });

  it('throws ConflictException when updating SiteCode to another Site code', async () => {
    const sites = new FakeSiteRepository();
    sites.FindById.mockResolvedValue(Site('site-1', 'SITE-HCM'));
    sites.FindByCode.mockResolvedValue(Site('site-2', 'SITE-HN'));

    const useCase = new UpdateSiteUseCase(sites);

    await expect(useCase.Execute({ Id: 'site-1', SiteCode: 'SITE-HN' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates changed Warehouse SiteId exists and is active', async () => {
    const sites = new FakeSiteRepository();
    const warehouses = new FakeWarehouseRepository();
    warehouses.FindById.mockResolvedValue(Warehouse('warehouse-1', 'site-1', 'WH-HCM'));
    sites.FindById.mockResolvedValue(Site('site-2', 'SITE-HN', MasterDataStatus.Inactive));

    const useCase = new UpdateWarehouseUseCase(warehouses, sites);

    await expect(useCase.Execute({ Id: 'warehouse-1', SiteId: 'site-2' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('throws ConflictException when updating WarehouseCode to another Warehouse code', async () => {
    const sites = new FakeSiteRepository();
    const warehouses = new FakeWarehouseRepository();
    warehouses.FindById.mockResolvedValue(Warehouse('warehouse-1', 'site-1', 'WH-HCM'));
    warehouses.FindByCode.mockResolvedValue(Warehouse('warehouse-2', 'site-1', 'WH-HN'));

    const useCase = new UpdateWarehouseUseCase(warehouses, sites);

    await expect(useCase.Execute({ Id: 'warehouse-1', WarehouseCode: 'WH-HN' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws NotFoundException when updating a missing Zone', async () => {
    const zones = new FakeZoneRepository();
    const warehouses = new FakeWarehouseRepository();
    zones.FindById.mockResolvedValue(null);

    const useCase = new UpdateZoneUseCase(zones, warehouses);

    await expect(useCase.Execute({ Id: 'missing-zone', ZoneName: 'Missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ConflictException when updating ZoneCode to a duplicate code in the target Warehouse', async () => {
    const zones = new FakeZoneRepository();
    const warehouses = new FakeWarehouseRepository();
    zones.FindById.mockResolvedValue(Zone('zone-1', 'warehouse-1', 'PICK'));
    zones.FindByWarehouseAndCode.mockResolvedValue(Zone('zone-2', 'warehouse-1', 'PACK'));

    const useCase = new UpdateZoneUseCase(zones, warehouses);

    await expect(useCase.Execute({ Id: 'zone-1', ZoneCode: 'PACK' })).rejects.toBeInstanceOf(ConflictException);
  });
});
