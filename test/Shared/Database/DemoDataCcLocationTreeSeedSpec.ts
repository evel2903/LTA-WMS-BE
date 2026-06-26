import { BuildDemoDataCcLocationTreePlan } from '@shared/Database/Seed/DemoDataCcLocationTreeSeed';

describe('DemoDataCcLocationTreeSeed', () => {
  it('builds the required Coca-Cola HCM zone set', () => {
    const plan = BuildDemoDataCcLocationTreePlan();

    expect(plan.WarehouseCode).toBe('CC-HCM-01');
    expect(plan.Zones.map((zone) => zone.ZoneCode)).toEqual([
      'CC-RCV',
      'CC-QC',
      'CC-RSV',
      'CC-PF',
      'CC-PACK',
      'CC-LOAD',
      'CC-QAR',
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
});
