import {
  IInventorySerialLookupRepository,
  InventorySerialLookupFilter,
  InventorySerialLookupRow,
} from '@modules/MasterData/Application/Interfaces/IInventorySerialLookupRepository';
import { ListInventorySerialLookupUseCase } from '@modules/MasterData/Application/UseCases/ListInventorySerialLookupUseCase';
import { MakeInventoryBalance, MakeInventoryDimension } from '@test/Modules/MasterData/InventoryTestDoubles';

class MemoryInventorySerialLookupRepository implements IInventorySerialLookupRepository {
  constructor(private readonly rows: InventorySerialLookupRow[]) {}

  public async List(
    skip: number,
    take: number,
    filter: InventorySerialLookupFilter,
  ): Promise<{ Items: InventorySerialLookupRow[]; TotalItems: number }> {
    let items = this.rows;
    if (filter.SkuId) items = items.filter((row) => row.Dimension.SkuId === filter.SkuId);
    if (filter.WarehouseId) items = items.filter((row) => row.Dimension.WarehouseId === filter.WarehouseId);
    if (filter.OwnerId) items = items.filter((row) => row.Dimension.OwnerId === filter.OwnerId);
    if (filter.SerialNumber) items = items.filter((row) => row.Dimension.SerialNumber === filter.SerialNumber);
    if (filter.LotNumber) items = items.filter((row) => row.Dimension.LotNumber === filter.LotNumber);

    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

const MakeRow = (overrides: Partial<InventorySerialLookupRow> = {}): InventorySerialLookupRow => ({
  Balance: MakeInventoryBalance(),
  Dimension: MakeInventoryDimension(),
  SkuCode: 'SKU-A',
  WarehouseCode: 'WH-A',
  LocationCode: 'A-01',
  InventoryStatusCode: 'AVAILABLE',
  ...overrides,
});

describe('ListInventorySerialLookupUseCase', () => {
  it('returns a paginated envelope mapped to DTO fields', async () => {
    const row = MakeRow();
    const useCase = new ListInventorySerialLookupUseCase(new MemoryInventorySerialLookupRepository([row]));

    const result = await useCase.Execute({});

    expect(result).toMatchObject({
      Items: [
        {
          DimensionId: row.Dimension.Id,
          SkuId: row.Dimension.SkuId,
          SkuCode: row.SkuCode,
          WarehouseId: row.Dimension.WarehouseId,
          WarehouseCode: row.WarehouseCode,
          LocationId: row.Dimension.LocationId,
          LocationCode: row.LocationCode,
          SerialNumber: row.Dimension.SerialNumber,
          LotNumber: row.Dimension.LotNumber,
          QtyOnHand: row.Balance.QtyOnHand,
          QtyAvailable: row.Balance.QtyAvailable,
          InventoryStatusCode: row.InventoryStatusCode,
        },
      ],
      Meta: { Page: 1, PageSize: 20, TotalItems: 1, TotalPages: 1 },
    });
  });

  it('forwards SkuId/WarehouseId/OwnerId/SerialNumber/LotNumber filters to the repository', async () => {
    const matching = MakeRow({
      Dimension: MakeInventoryDimension({ Id: 'dimension-match', SerialNumber: 'SN-001', LotNumber: 'LOT-001' }),
    });
    const other = MakeRow({
      Dimension: MakeInventoryDimension({
        Id: 'dimension-other',
        SkuId: 'sku-other',
        WarehouseId: 'warehouse-other',
        OwnerId: 'owner-other',
        SerialNumber: 'SN-999',
        LotNumber: 'LOT-999',
      }),
    });
    const useCase = new ListInventorySerialLookupUseCase(new MemoryInventorySerialLookupRepository([matching, other]));

    const result = await useCase.Execute({
      SkuId: 'sku-active',
      WarehouseId: 'warehouse-active',
      OwnerId: 'owner-active',
      SerialNumber: 'SN-001',
      LotNumber: 'LOT-001',
    });

    expect(result.Meta.TotalItems).toBe(1);
    expect(result.Items).toHaveLength(1);
    expect(result.Items[0].DimensionId).toBe('dimension-match');
  });

  it('respects Page/PageSize for pagination', async () => {
    const rows = Array.from({ length: 3 }, (_, index) =>
      MakeRow({ Dimension: MakeInventoryDimension({ Id: `dimension-${index}` }) }),
    );
    const useCase = new ListInventorySerialLookupUseCase(new MemoryInventorySerialLookupRepository(rows));

    const result = await useCase.Execute({ Page: 2, PageSize: 2 });

    expect(result.Meta).toMatchObject({ Page: 2, PageSize: 2, TotalItems: 3, TotalPages: 2 });
    expect(result.Items).toHaveLength(1);
  });
});
