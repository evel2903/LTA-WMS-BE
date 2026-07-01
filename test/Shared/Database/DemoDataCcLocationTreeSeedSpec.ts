import {
  AssertDemoDataCcWritableLocationTreeRow,
  BuildDemoDataCcLocationTreePlan,
} from '@shared/Database/Seed/DemoDataCcLocationTreeSeed';

describe('DemoDataCcLocationTreeSeed', () => {
  it('builds the required LTA HCM zone set', () => {
    const plan = BuildDemoDataCcLocationTreePlan();

    expect(plan.WarehouseCode).toBe('LTA-HCM-01');
    expect(plan.Zones.map((zone) => zone.ZoneCode)).toEqual([
      'LTA-RCV',
      'LTA-QC',
      'LTA-RSV',
      'LTA-PF',
      'LTA-PACK',
      'LTA-LOAD',
      'LTA-QAR',
    ]);
  });

  it('builds parent locations before their children', () => {
    const plan = BuildDemoDataCcLocationTreePlan();
    const order = new Map(plan.Locations.map((location, index) => [location.LocationCode, index]));

    for (const location of plan.Locations) {
      if (location.ParentLocationCode) {
        const parentOrder = order.get(location.ParentLocationCode);
        const locationOrder = order.get(location.LocationCode);

        expect(parentOrder).toBeDefined();
        expect(locationOrder).toBeDefined();
        expect(parentOrder as number).toBeLessThan(locationOrder as number);
      }
    }
  });

  it('includes reserve and pick-face bin depth for visual tree demo', () => {
    const plan = BuildDemoDataCcLocationTreePlan();
    const codes = plan.Locations.map((location) => location.LocationCode);

    expect(codes).toEqual(expect.arrayContaining(['RSV-A01-R01-L01-B01', 'PF-A01-R01-L01-B01']));
    expect(plan.Locations.some((location) => location.PalletSlot && location.PalletSlot > 0)).toBe(true);
  });

  it('blocks overwriting existing location tree rows that are not owned by the demo seed', () => {
    expect(() => AssertDemoDataCcWritableLocationTreeRow({ SourceSystem: 'SEED' }, 'location', 'PF-A01')).toThrow(
      'existing non-demo location PF-A01',
    );

    expect(() =>
      AssertDemoDataCcWritableLocationTreeRow({ SourceSystem: 'DEMO-DATA-LTA' }, 'location', 'PF-A01'),
    ).not.toThrow();
  });
});
