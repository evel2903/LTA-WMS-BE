import {
  BuildDemoDataCcScreenCoveragePlan,
  DemoDataCcScreenCoverageTables,
} from '@shared/Database/Seed/DemoDataCcScreenCoverageSeed';

describe('DemoDataCcScreenCoverageSeed', () => {
  it('covers implemented screen groups without fake live capability', () => {
    const plan = BuildDemoDataCcScreenCoveragePlan();

    expect(plan.NoFakeLiveCapability).toBe(true);
    expect(plan.ScreenGroups).toEqual([
      'barcode-label',
      'rf-mobile',
      'cycle-count',
      'replenishment',
      'approval-audit-override-exception',
    ]);
  });

  it('tracks the tables that should receive demo rows or a correct screen state', () => {
    expect(DemoDataCcScreenCoverageTables).toContain('label_templates');
    expect(DemoDataCcScreenCoverageTables).toContain('mobile_tasks');
    expect(DemoDataCcScreenCoverageTables).toContain('cycle_count_works');
    expect(DemoDataCcScreenCoverageTables).toContain('replenishment_tasks');
    expect(DemoDataCcScreenCoverageTables).toContain('approval_requests');
    expect(DemoDataCcScreenCoverageTables).toContain('audit_logs');
  });
});
