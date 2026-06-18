import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/CreateItemCoverageUseCase';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

class FakeItemCoverageRepository implements IItemCoverageRepository {
  public FindById = jest.fn<Promise<ItemCoverageEntity | null>, [string]>();
  public FindBySkuWarehouseOwner = jest.fn<Promise<ItemCoverageEntity | null>, [string, string, string | null]>();
  public Create = jest.fn<Promise<ItemCoverageEntity>, [ItemCoverageEntity]>();
  public Update = jest.fn<Promise<ItemCoverageEntity>, [ItemCoverageEntity]>();
  public List = jest.fn<Promise<{ Items: ItemCoverageEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeSkuRepository implements ISkuRepository {
  public FindById = jest.fn<Promise<SkuEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<SkuEntity | null>, [string]>();
  public Create = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public Update = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public List = jest.fn<Promise<{ Items: SkuEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeWarehouseRepository implements IWarehouseRepository {
  public FindById = jest.fn<Promise<WarehouseEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<WarehouseEntity | null>, [string]>();
  public Create = jest.fn<Promise<WarehouseEntity>, [WarehouseEntity]>();
  public Update = jest.fn<Promise<WarehouseEntity>, [WarehouseEntity]>();
  public List = jest.fn<Promise<{ Items: WarehouseEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeOwnerRepository implements IOwnerRepository {
  public FindById = jest.fn<Promise<OwnerEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<OwnerEntity | null>, [string]>();
  public Create = jest.fn<Promise<OwnerEntity>, [OwnerEntity]>();
  public Update = jest.fn<Promise<OwnerEntity>, [OwnerEntity]>();
  public List = jest.fn<Promise<{ Items: OwnerEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Sku = () =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-001',
    SkuName: 'SKU 001',
    ItemClass: 'DRY',
    ItemStatus: SkuStatus.Active,
    BaseUomId: 'uom-ea',
    InventoryUomId: 'uom-ea',
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Warehouse = (id = 'warehouse-tier-1', status = MasterDataStatus.Active) =>
  new WarehouseEntity({
    Id: id,
    SiteId: 'site-1',
    WarehouseCode: id.toUpperCase(),
    WarehouseName: id,
    WarehouseTypeCode: 'TIER_1',
    Status: status,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Owner = (status = MasterDataStatus.Active) =>
  new OwnerEntity({
    Id: 'owner-1',
    OwnerCode: 'OWNER-A',
    OwnerName: 'Owner A',
    Status: status,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Coverage = () =>
  new ItemCoverageEntity({
    Id: 'coverage-1',
    SkuId: 'sku-1',
    WarehouseId: 'warehouse-tier-1',
    OwnerId: null,
    MinQty: 10,
    MaxQty: 100,
    StandardQty: 24,
    MultipleQty: 6,
    LeadTimeDays: 2,
    DefaultReceiveWarehouseId: 'warehouse-tier-1',
    DefaultShipWarehouseId: 'warehouse-tier-1',
    ReorderPolicy: { Method: 'MinMax' },
    StopReceiving: false,
    StopShipping: false,
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const buildUseCase = () => {
  const coverages = new FakeItemCoverageRepository();
  const skus = new FakeSkuRepository();
  const warehouses = new FakeWarehouseRepository();
  const owners = new FakeOwnerRepository();
  coverages.FindBySkuWarehouseOwner.mockResolvedValue(null);
  coverages.Create.mockImplementation(async (coverage) => coverage);
  skus.FindById.mockResolvedValue(Sku());
  warehouses.FindById.mockImplementation(async (id) => Warehouse(id));
  owners.FindById.mockResolvedValue(Owner());
  return {
    coverages,
    skus,
    warehouses,
    owners,
    useCase: new CreateItemCoverageUseCase(coverages, skus, warehouses, owners),
  };
};

describe('CreateItemCoverageUseCase', () => {
  it('creates item coverage for active SKU and Tier 1 warehouse with default order settings', async () => {
    const { useCase } = buildUseCase();

    const created = await useCase.Execute({
      SkuId: 'sku-1',
      WarehouseId: 'warehouse-tier-1',
      MinQty: 10,
      MaxQty: 100,
      StandardQty: 24,
      MultipleQty: 6,
      LeadTimeDays: 2,
      DefaultReceiveWarehouseId: 'warehouse-tier-1',
      DefaultShipWarehouseId: 'warehouse-tier-1',
      ReorderPolicy: { Method: 'MinMax' },
      Status: MasterDataStatus.Active,
    });

    expect(created.SkuId).toBe('sku-1');
    expect(created.WarehouseId).toBe('warehouse-tier-1');
    expect(created.MultipleQty).toBe(6);
  });

  it('rejects duplicate coverage for nullable owner scope', async () => {
    const { coverages, useCase } = buildUseCase();
    coverages.FindBySkuWarehouseOwner.mockResolvedValue(Coverage());

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        WarehouseId: 'warehouse-tier-1',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate coverage for explicit owner scope', async () => {
    const { coverages, useCase } = buildUseCase();
    coverages.FindBySkuWarehouseOwner.mockResolvedValue(new ItemCoverageEntity({ ...Coverage(), OwnerId: 'owner-1' }));

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        WarehouseId: 'warehouse-tier-1',
        OwnerId: 'owner-1',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(coverages.FindBySkuWarehouseOwner).toHaveBeenCalledWith('sku-1', 'warehouse-tier-1', 'owner-1');
  });

  it('rejects inactive owner/default warehouse and invalid quantity range', async () => {
    const { owners, warehouses, useCase } = buildUseCase();
    owners.FindById.mockResolvedValue(Owner(MasterDataStatus.Inactive));

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        WarehouseId: 'warehouse-tier-1',
        OwnerId: 'owner-1',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    owners.FindById.mockResolvedValue(Owner());
    warehouses.FindById.mockImplementation(async (id) =>
      Warehouse(id, id === 'inactive-warehouse' ? MasterDataStatus.Inactive : MasterDataStatus.Active),
    );

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        WarehouseId: 'warehouse-tier-1',
        DefaultReceiveWarehouseId: 'inactive-warehouse',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        WarehouseId: 'warehouse-tier-1',
        MinQty: 100,
        MaxQty: 10,
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects missing references even when coverage is inactive', async () => {
    const { skus, warehouses, owners, useCase } = buildUseCase();
    skus.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        SkuId: 'missing-sku',
        WarehouseId: 'warehouse-tier-1',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    skus.FindById.mockResolvedValue(Sku());
    warehouses.FindById.mockImplementation(async (id) => (id === 'missing-warehouse' ? null : Warehouse(id)));

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        WarehouseId: 'missing-warehouse',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    owners.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        WarehouseId: 'warehouse-tier-1',
        OwnerId: 'missing-owner',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
