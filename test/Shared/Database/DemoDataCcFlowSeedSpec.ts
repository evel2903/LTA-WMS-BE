import {
  BuildDemoDataCcFlowPlan,
  DemoDataCcForbiddenFlowInventoryStatuses,
} from '@shared/Database/Seed/DemoDataCcFlowSeed';

describe('DemoDataCcFlowSeed', () => {
  it('builds three Coca-Cola demo scenarios in the approved single warehouse', () => {
    const plan = BuildDemoDataCcFlowPlan();

    expect(plan.WarehouseCode).toBe('CC-HCM-01');
    expect(plan.OwnerCode).toBe('CCVN');
    expect(plan.Scenarios.map((item) => item.ScenarioCode)).toEqual(['WT-01', 'WT-05', 'WT-06']);
    expect(plan.Scenarios.map((item) => item.FlowReference)).toEqual(['CC-DEMO-WT01', 'CC-DEMO-WT05', 'CC-DEMO-WT06']);
  });

  it('keeps goods issue and reconciliation milestones out of InventoryStatus', () => {
    const scenarioStatuses = ['READY_FOR_PUTAWAY', 'AVAILABLE', 'LOADED'];

    for (const forbidden of DemoDataCcForbiddenFlowInventoryStatuses) {
      expect(scenarioStatuses).not.toContain(forbidden);
    }
  });

  it('uses LPN-based flow data without SSCC requirements', () => {
    const plan = BuildDemoDataCcFlowPlan();

    for (const scenario of plan.Scenarios) {
      expect(scenario.FlowReference).toMatch(/^CC-DEMO-/);
      expect(scenario.GoodsIssueTrigger).toBe('at_loading');
      expect(Object.keys(scenario)).not.toContain('SsccCode');
    }
  });
});
