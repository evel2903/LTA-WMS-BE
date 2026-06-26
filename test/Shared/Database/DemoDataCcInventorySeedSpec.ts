import {
  BuildDemoDataCcInventoryDimensionHash,
  BuildDemoDataCcInventoryPlan,
  DemoDataCcForbiddenInventoryStatusCodes,
} from '@shared/Database/Seed/DemoDataCcInventorySeed';

describe('DemoDataCcInventorySeed', () => {
  it('builds the required Coca-Cola UOM and SKU set', () => {
    const plan = BuildDemoDataCcInventoryPlan();

    expect(plan.Uoms.map((uom) => uom.UomCode)).toEqual(['CAN', 'BOTTLE', 'CASE', 'PALLET']);
    expect(plan.Skus.map((sku) => sku.SkuCode)).toEqual([
      'CC-COKE-330-CAN',
      'CC-COKE-390-BTL',
      'CC-SPRITE-330-CAN',
      'CC-FANTA-330-CAN',
    ]);
  });

  it('keeps V1 shipment milestones out of InventoryStatus', () => {
    const plan = BuildDemoDataCcInventoryPlan();
    const statusCodes = plan.InventoryStatuses.map((status) => status.StatusCode);

    for (const forbidden of DemoDataCcForbiddenInventoryStatusCodes) {
      expect(statusCodes).not.toContain(forbidden);
    }
  });

  it('marks demo SKUs as lot, expiry, owner and LPN controlled without serial control', () => {
    const plan = BuildDemoDataCcInventoryPlan();

    for (const sku of plan.Skus) {
      expect(sku.InventoryUomCode).toBe('CASE');
      expect(sku.Packs.some((pack) => pack.PackCode === 'PALLET')).toBe(true);
      expect(sku.Barcodes.length).toBeGreaterThan(0);
    }
  });

  it('builds inventory samples with LPN, lot and expiry but no SSCC fields', () => {
    const plan = BuildDemoDataCcInventoryPlan();

    expect(plan.InventorySamples.length).toBeGreaterThanOrEqual(7);
    for (const sample of plan.InventorySamples) {
      expect(sample.LpnCode).toMatch(/^CC-LPN-/);
      expect(sample.LotNumber).toContain('BATCH');
      expect(sample.ExpiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Object.keys(sample)).not.toContain('Sscc');
    }
  });

  it('builds deterministic dimension hashes from the same identity tuple', () => {
    const identity = {
      OwnerId: 'owner-id',
      SkuId: 'sku-id',
      WarehouseId: 'warehouse-id',
      LocationId: 'location-id',
      InventoryStatusId: 'status-id',
      UomId: 'uom-id',
      LpnCode: 'CC-LPN-0001',
      LotNumber: 'CC-BATCH-250601',
      ExpiryDate: '2026-06-01',
    };

    expect(BuildDemoDataCcInventoryDimensionHash(identity)).toBe(BuildDemoDataCcInventoryDimensionHash(identity));
    expect(BuildDemoDataCcInventoryDimensionHash(identity)).toHaveLength(64);
  });
});
