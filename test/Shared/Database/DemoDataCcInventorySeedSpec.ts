import {
  AssertDemoDataCcWritableInventoryRow,
  AssertReusableDemoDataCcInventoryStatusCatalogRow,
  AssertReusableDemoDataCcUomCatalogRow,
  BuildDemoDataCcInventoryDimensionHash,
  BuildDemoDataCcInventoryPlan,
  DemoDataCcForbiddenInventoryStatusCodes,
  ShouldReuseExistingDemoDataCcCatalogRow,
} from '@shared/Database/Seed/DemoDataCcInventorySeed';

describe('DemoDataCcInventorySeed', () => {
  it('builds the required LTA seal UOM and SKU set', () => {
    const plan = BuildDemoDataCcInventoryPlan();

    expect(plan.Uoms.map((uom) => uom.UomCode)).toEqual(['PCS', 'BOX', 'CARTON', 'PALLET']);
    expect(plan.Skus.map((sku) => sku.SkuCode)).toEqual([
      'LTA-SEAL-CABLE-001',
      'LTA-SEAL-BOLT-001',
      'LTA-SEAL-PLASTIC-001',
      'LTA-SEAL-RFID-001',
    ]);
  });

  it('keeps V1 shipment milestones out of InventoryStatus', () => {
    const plan = BuildDemoDataCcInventoryPlan();
    const statusCodes = plan.InventoryStatuses.map((status) => status.StatusCode);

    for (const forbidden of DemoDataCcForbiddenInventoryStatusCodes) {
      expect(statusCodes).not.toContain(forbidden);
    }
  });

  it('reuses baseline catalog UOM and status rows instead of retagging them as LTA demo-owned', () => {
    expect(ShouldReuseExistingDemoDataCcCatalogRow({ SourceSystem: 'SEED' })).toBe(true);
    expect(ShouldReuseExistingDemoDataCcCatalogRow({ SourceSystem: 'MASTER' })).toBe(true);
    expect(ShouldReuseExistingDemoDataCcCatalogRow({ SourceSystem: 'DEMO-DATA-LTA' })).toBe(false);
    expect(ShouldReuseExistingDemoDataCcCatalogRow(null)).toBe(false);
  });

  it('rejects existing non-demo inventory rows before overwriting demo LTA keys', () => {
    expect(() => AssertDemoDataCcWritableInventoryRow({ SourceSystem: 'SEED' }, 'SKU', 'LTA-SEAL-CABLE-001')).toThrow(
      'existing non-demo SKU LTA-SEAL-CABLE-001',
    );
    expect(() =>
      AssertDemoDataCcWritableInventoryRow({ SourceSystem: null }, 'inventory dimension', 'LTA-LPN-0001'),
    ).toThrow('existing non-demo inventory dimension LTA-LPN-0001');
    expect(() =>
      AssertDemoDataCcWritableInventoryRow({ SourceSystem: 'DEMO-DATA-LTA' }, 'SKU', 'LTA-SEAL-CABLE-001'),
    ).not.toThrow();
    expect(() => AssertDemoDataCcWritableInventoryRow(null, 'SKU', 'LTA-SEAL-CABLE-001')).not.toThrow();
  });

  it('rejects incompatible baseline catalog rows instead of silently reusing them', () => {
    const plan = BuildDemoDataCcInventoryPlan();
    const box = plan.Uoms.find((item) => item.UomCode === 'BOX');
    const available = plan.InventoryStatuses.find((item) => item.StatusCode === 'AVAILABLE');

    expect(box).toBeDefined();
    expect(available).toBeDefined();
    expect(() =>
      AssertReusableDemoDataCcUomCatalogRow(
        {
          UomCode: 'BOX',
          UomType: 'Quantity',
          DecimalPrecision: 2,
          Status: 'Active',
          SourceSystem: 'SEED',
        } as never,
        box as never,
      ),
    ).toThrow('DecimalPrecision');
    expect(() =>
      AssertReusableDemoDataCcInventoryStatusCatalogRow(
        {
          StatusCode: 'AVAILABLE',
          StageGroup: 'StorageControl',
          AllowsAllocation: false,
          AllowsPick: true,
          Hold: false,
          IsTerminal: false,
          IsMilestone: false,
          Status: 'Active',
          SourceSystem: 'SEED',
        } as never,
        available as never,
      ),
    ).toThrow('AllowsAllocation');
  });

  it('marks demo SKUs as lot, expiry, owner and LPN controlled without serial control', () => {
    const plan = BuildDemoDataCcInventoryPlan();

    for (const sku of plan.Skus) {
      expect(sku.BaseUomCode).toBe('PCS');
      expect(sku.InventoryUomCode).toBe('BOX');
      expect(sku.ItemClass).toBe('CONTAINER_SEAL');
      expect(sku.Packs.some((pack) => pack.PackCode === 'CARTON' && pack.UomCode === 'CARTON')).toBe(true);
      expect(sku.Packs.some((pack) => pack.PackCode === 'PALLET')).toBe(true);
      expect(sku.Conversions.some((conversion) => conversion.FromUomCode === 'CARTON')).toBe(true);
      expect(sku.Barcodes.length).toBeGreaterThan(0);
    }
  });

  it('does not include old Coca-Cola beverage SKUs or UOMs in the LTA seal plan', () => {
    const plan = BuildDemoDataCcInventoryPlan();
    const oldUomCodes = ['CAN', 'BOTTLE', 'CASE'];
    const forbiddenText = /coca|coke|sprite|fanta|beverage|chai|lon/i;

    expect(plan.Uoms.map((uom) => uom.UomCode)).not.toEqual(expect.arrayContaining(oldUomCodes));
    for (const sku of plan.Skus) {
      expect(sku.SkuCode).toMatch(/^LTA-SEAL-/);
      expect(sku.SkuCode).not.toMatch(/^CC-/);
      expect(sku.SkuName).not.toMatch(forbiddenText);
    }
  });

  it('keeps available LTA seal inventory within the SKU remaining shelf-life policy on 2026-07-01', () => {
    const plan = BuildDemoDataCcInventoryPlan();
    const skuByCode = new Map(plan.Skus.map((sku) => [sku.SkuCode, sku]));
    const demoToday = new Date('2026-07-01T00:00:00.000Z');
    const msPerDay = 24 * 60 * 60 * 1000;

    for (const sample of plan.InventorySamples.filter((item) => item.InventoryStatusCode === 'AVAILABLE')) {
      const sku = skuByCode.get(sample.SkuCode);
      expect(sku).toBeDefined();
      const remainingDays = Math.floor(
        (new Date(`${sample.ExpiryDate}T00:00:00.000Z`).getTime() - demoToday.getTime()) / msPerDay,
      );
      expect(remainingDays).toBeGreaterThanOrEqual(sku?.MinRemainingShelfLifeDays ?? 0);
    }
  });

  it('builds inventory samples with LPN, lot and expiry but no SSCC fields', () => {
    const plan = BuildDemoDataCcInventoryPlan();

    expect(plan.InventorySamples.length).toBeGreaterThanOrEqual(7);
    for (const sample of plan.InventorySamples) {
      expect(sample.LpnCode).toMatch(/^LTA-LPN-/);
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
      LpnCode: 'LTA-LPN-0001',
      LotNumber: 'LTA-SEAL-BATCH-250601',
      ExpiryDate: '2026-06-01',
    };

    expect(BuildDemoDataCcInventoryDimensionHash(identity)).toBe(BuildDemoDataCcInventoryDimensionHash(identity));
    expect(BuildDemoDataCcInventoryDimensionHash(identity)).toHaveLength(64);
  });
});
