import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';

describe('ScopeKeyService', () => {
  const service = new ScopeKeyService();

  it('produces a deterministic key for the same scope regardless of call order', () => {
    const scope = {
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: 'warehouse-1',
      ZoneId: 'zone-1',
      LocationType: 'BULK',
      OwnerId: 'owner-1',
      SkuId: 'sku-1',
      ItemClass: 'DRY',
      OrderType: 'B2B',
      CustomerId: 'customer-1',
      SupplierId: 'supplier-1',
    };

    expect(service.Build(scope)).toBe(service.Build({ ...scope }));
  });

  it('treats null/undefined/absent axes identically (wildcard)', () => {
    const fromNull = service.Build({
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: null,
      ZoneId: null,
      LocationType: null,
      OwnerId: null,
      SkuId: null,
      ItemClass: null,
      OrderType: null,
      CustomerId: null,
      SupplierId: null,
    });
    const fromAbsent = service.Build({ WarehouseTypeCode: 'TIER_1' });

    expect(fromNull).toBe(fromAbsent);
  });

  it('produces different keys when any axis value differs', () => {
    const base = service.Build({ WarehouseTypeCode: 'TIER_1', WarehouseId: 'warehouse-1' });
    const differentWarehouse = service.Build({ WarehouseTypeCode: 'TIER_1', WarehouseId: 'warehouse-2' });
    const differentType = service.Build({ WarehouseTypeCode: 'TIER_2', WarehouseId: 'warehouse-1' });

    expect(base).not.toBe(differentWarehouse);
    expect(base).not.toBe(differentType);
  });

  it('does not collide when the same value moves to a different axis', () => {
    const onOwner = service.Build({ WarehouseTypeCode: 'TIER_1', OwnerId: 'X' });
    const onSku = service.Build({ WarehouseTypeCode: 'TIER_1', SkuId: 'X' });

    expect(onOwner).not.toBe(onSku);
  });

  it('normalizes case and surrounding whitespace of the warehouse type code', () => {
    const lower = service.Build({ WarehouseTypeCode: '  tier_1 ' });
    const upper = service.Build({ WarehouseTypeCode: 'TIER_1' });

    expect(lower).toBe(upper);
  });
});
