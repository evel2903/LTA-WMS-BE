import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateInventoryDimensionUseCase } from '@modules/MasterData/Application/UseCases/CreateInventoryDimensionUseCase';
import { GetInventoryDimensionUseCase } from '@modules/MasterData/Application/UseCases/GetInventoryDimensionUseCase';
import { ListInventoryDimensionsUseCase } from '@modules/MasterData/Application/UseCases/ListInventoryDimensionsUseCase';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import {
  MakeInventoryStatus,
  MakeLocation,
  MakeOwner,
  MakeSku,
  MakeUom,
  MakeWarehouse,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
  MemoryLocationRepository,
  MemoryOwnerRepository,
  MemorySkuRepository,
  MemoryUomRepository,
  MemoryWarehouseRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';

const BaseRequest = {
  OwnerId: 'owner-active',
  SkuId: 'sku-active',
  WarehouseId: 'warehouse-active',
  LocationId: 'location-active',
  InventoryStatusId: 'status-available',
  UomId: 'uom-ea',
};

const BuildUseCase = (
  overrides: Partial<{
    owners: MemoryOwnerRepository;
    skus: MemorySkuRepository;
    warehouses: MemoryWarehouseRepository;
    locations: MemoryLocationRepository;
    statuses: MemoryInventoryStatusRepository;
    uoms: MemoryUomRepository;
    dimensions: MemoryInventoryDimensionRepository;
  }> = {},
) => {
  const dimensions = overrides.dimensions ?? new MemoryInventoryDimensionRepository();
  return {
    dimensions,
    useCase: new CreateInventoryDimensionUseCase(
      dimensions,
      overrides.owners ?? new MemoryOwnerRepository(),
      overrides.skus ?? new MemorySkuRepository(),
      overrides.warehouses ?? new MemoryWarehouseRepository(),
      overrides.locations ?? new MemoryLocationRepository(),
      overrides.statuses ?? new MemoryInventoryStatusRepository(),
      overrides.uoms ?? new MemoryUomRepository(),
      new InventoryDimensionKeyService(),
    ),
  };
};

describe('InventoryDimensionKeyService', () => {
  it('creates a deterministic SHA-256 hash from mandatory and optional identity fields', () => {
    const service = new InventoryDimensionKeyService();
    const first = service.BuildHash({
      ...BaseRequest,
      LpnCode: ' LPN-001 ',
      LotNumber: 'LOT-001',
      ExpiryDate: new Date('2026-06-18T14:30:00.000Z'),
      SerialNumber: 'SER-001',
      ProductionDate: new Date('2026-01-01T07:00:00.000Z'),
      CountryOfOrigin: 'VN',
      CustomsStatus: 'BONDED',
    });
    const second = service.BuildHash({
      ...BaseRequest,
      LpnCode: 'LPN-001',
      LotNumber: 'LOT-001',
      ExpiryDate: new Date('2026-06-18T00:00:00.000Z'),
      SerialNumber: 'SER-001',
      ProductionDate: new Date('2026-01-01T00:00:00.000Z'),
      CountryOfOrigin: 'VN',
      CustomsStatus: 'BONDED',
    });

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });

  it.each([
    ['InventoryStatusId', { InventoryStatusId: 'status-hold' }],
    ['LotNumber', { LotNumber: 'LOT-002' }],
    ['SerialNumber', { SerialNumber: 'SER-002' }],
    ['ExpiryDate', { ExpiryDate: new Date('2026-06-19T00:00:00.000Z') }],
    ['UomId', { UomId: null }],
    ['LpnCode', { LpnCode: 'LPN-002' }],
  ])('changes hash when %s changes', (_field, patch) => {
    const service = new InventoryDimensionKeyService();
    const baseHash = service.BuildHash({
      ...BaseRequest,
      LotNumber: 'LOT-001',
      SerialNumber: 'SER-001',
      ExpiryDate: new Date('2026-06-18T00:00:00.000Z'),
      LpnCode: 'LPN-001',
    });

    expect(
      service.BuildHash({
        ...BaseRequest,
        LotNumber: 'LOT-001',
        SerialNumber: 'SER-001',
        ExpiryDate: new Date('2026-06-18T00:00:00.000Z'),
        LpnCode: 'LPN-001',
        ...patch,
      }),
    ).not.toBe(baseHash);
  });
});

describe('CreateInventoryDimensionUseCase', () => {
  it('creates a dimension for active owner, SKU, warehouse, location, status and UOM', async () => {
    const { useCase } = BuildUseCase();

    const dimension = await useCase.Execute({
      ...BaseRequest,
      LpnCode: null,
      LotNumber: undefined,
      ExpiryDate: new Date('2026-06-18T00:00:00.000Z'),
    });

    expect(dimension.Id).toBeTruthy();
    expect(dimension.OwnerId).toBe('owner-active');
    expect(dimension.UomId).toBe('uom-ea');
    expect(dimension.LpnCode).toBeNull();
    expect(dimension.LotNumber).toBeNull();
    expect(dimension.ExpiryDate).toEqual(new Date('2026-06-18T00:00:00.000Z'));
    expect(dimension.DimensionKeyHash).toHaveLength(64);
  });

  it('blocks duplicate dimensions with the same identity before persistence', async () => {
    const { useCase } = BuildUseCase();

    await useCase.Execute(BaseRequest);

    await expect(useCase.Execute(BaseRequest)).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['owner inactive', { owners: new MemoryOwnerRepository([MakeOwner({ Status: MasterDataStatus.Inactive })]) }],
    ['SKU inactive', { skus: new MemorySkuRepository([MakeSku({ ItemStatus: SkuStatus.Blocked })]) }],
    [
      'warehouse inactive',
      { warehouses: new MemoryWarehouseRepository([MakeWarehouse({ Status: MasterDataStatus.Inactive })]) },
    ],
    [
      'location inactive',
      { locations: new MemoryLocationRepository([MakeLocation({ LocationStatus: LocationStatus.Inactive })]) },
    ],
    [
      'inventory status inactive',
      {
        statuses: new MemoryInventoryStatusRepository([MakeInventoryStatus({ Status: MasterDataStatus.Inactive })]),
      },
    ],
    ['UOM inactive', { uoms: new MemoryUomRepository([MakeUom({ Status: MasterDataStatus.Inactive })]) }],
  ])('rejects dimension when %s', async (_case, overrides) => {
    const { useCase } = BuildUseCase(overrides);

    await expect(useCase.Execute(BaseRequest)).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects missing references with a controlled not found error', async () => {
    const { useCase } = BuildUseCase({ owners: new MemoryOwnerRepository([]) });

    await expect(useCase.Execute(BaseRequest)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a location that belongs to another warehouse', async () => {
    const { useCase } = BuildUseCase({
      locations: new MemoryLocationRepository([MakeLocation({ WarehouseId: 'warehouse-other' })]),
    });

    await expect(useCase.Execute(BaseRequest)).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it.each(['LpnCode', 'LotNumber', 'SerialNumber', 'CountryOfOrigin', 'CustomsStatus'] as const)(
    'rejects empty optional string dimension %s',
    async (field) => {
      const { useCase } = BuildUseCase();

      await expect(useCase.Execute({ ...BaseRequest, [field]: '   ' })).rejects.toBeInstanceOf(BusinessRuleException);
    },
  );

  it('supports get and list use cases for created dimensions', async () => {
    const { useCase, dimensions } = BuildUseCase();
    const created = await useCase.Execute({ ...BaseRequest, LotNumber: 'LOT-001' });

    const getUseCase = new GetInventoryDimensionUseCase(dimensions);
    const listUseCase = new ListInventoryDimensionsUseCase(dimensions);

    await expect(getUseCase.Execute(created.Id)).resolves.toMatchObject({ Id: created.Id });
    await expect(listUseCase.Execute(0, 10, { SkuId: 'sku-active' })).resolves.toMatchObject({
      TotalItems: 1,
      Items: [expect.objectContaining({ Id: created.Id })],
    });
  });
});
