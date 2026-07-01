import {
  BuildDemoDataCcFlowPlan,
  BuildDemoDataCcFlowOutboxEvidenceRefs,
  BuildDemoDataCcFlowOutboxPayload,
  BuildDemoDataCcFlowShippingEvidenceRefs,
  CleanupDemoDataCcFlow,
  DemoDataCcForbiddenFlowInventoryStatuses,
  GetDemoDataCcFlowOutboxEventTime,
} from '@shared/Database/Seed/DemoDataCcFlowSeed';

describe('DemoDataCcFlowSeed', () => {
  const fakeLocalConnection = {
    options: {
      host: 'localhost',
      port: 5432,
      database: 'backend_seed',
    },
  };

  beforeAll(() => {
    process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
    process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
    process.env.DB_PORT = process.env.DB_PORT ?? '5432';
    process.env.DB_DATABASE = process.env.DB_DATABASE ?? 'backend_seed';
    process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'postgres';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'postgres';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '15m';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
    process.env.JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION ?? '7d';
  });

  it('builds only the WT-01 LTA container seal demo scenario in the approved single warehouse', () => {
    const plan = BuildDemoDataCcFlowPlan();

    expect(plan.WarehouseCode).toBe('LTA-HCM-01');
    expect(plan.OwnerCode).toBe('LTA');
    expect(plan.Scenarios).toHaveLength(1);
    expect(plan.Scenarios.map((item) => item.ScenarioCode)).toEqual(['WT-01']);
    expect(plan.Scenarios.map((item) => item.FlowReference)).toEqual(['LTA-DEMO-WT01']);
    expect(plan.Scenarios.map((item) => item.ContainerNumber)).toEqual(['CONT-LTA-WT01-0001']);
    expect(plan.Scenarios.map((item) => item.SealNumber)).toEqual(['SEAL-LTA-WT01-20260701']);
    expect(plan.Scenarios.map((item) => item.ShipmentReference)).toEqual(['LTA-WT01-SEAL-DEMO']);
  });

  it('keeps goods issue and reconciliation milestones out of InventoryStatus', () => {
    const scenarioStatuses = ['READY_FOR_PUTAWAY', 'AVAILABLE', 'LOADED'];

    for (const forbidden of DemoDataCcForbiddenFlowInventoryStatuses) {
      expect(scenarioStatuses).not.toContain(forbidden);
    }
  });

  it('uses LPN-based container seal flow data without SSCC requirements', () => {
    const plan = BuildDemoDataCcFlowPlan();

    for (const scenario of plan.Scenarios) {
      expect(scenario.FlowReference).toMatch(/^LTA-DEMO-/);
      expect(scenario.GoodsIssueTrigger).toBe('at_loading');
      expect(scenario.TruckReference).toBe('TRUCK-LTA-WT01-0001');
      expect(scenario.TruckReference).not.toBe(scenario.ContainerNumber);
      expect(scenario.LoadReference).toBe('LOAD-LTA-WT01-SEAL');
      expect(scenario.GateOutReference).toBe('GATEOUT-LTA-WT01-SEAL');
      expect(Object.keys(scenario)).not.toContain('SsccCode');
    }
  });

  it('keeps PackagePacked outbox payload scoped to pack-time container and seal evidence', () => {
    const scenario = BuildDemoDataCcFlowPlan().Scenarios[0];

    const packagePackedPayload = BuildDemoDataCcFlowOutboxPayload({
      EventType: 'PackagePacked',
      Scenario: scenario,
      SourceId: 'package-id',
      UomCode: 'BOX',
    });
    const loadingPayload = BuildDemoDataCcFlowOutboxPayload({
      EventType: 'LoadingConfirmed',
      Scenario: scenario,
      SourceId: 'shipment-staging-id',
      UomCode: 'BOX',
    });
    const goodsIssuePayload = BuildDemoDataCcFlowOutboxPayload({
      EventType: 'GoodsIssuePosted',
      Scenario: scenario,
      SourceId: 'goods-issue-id',
      UomCode: 'BOX',
    });

    expect(packagePackedPayload).toMatchObject({
      ContainerNumber: 'CONT-LTA-WT01-0001',
      SealNumber: 'SEAL-LTA-WT01-20260701',
    });
    expect(packagePackedPayload).not.toHaveProperty('LoadReference');
    expect(packagePackedPayload).not.toHaveProperty('GateOutReference');
    expect(packagePackedPayload).not.toHaveProperty('ShipmentReference');
    expect(packagePackedPayload).not.toHaveProperty('TruckReference');
    expect(packagePackedPayload).not.toHaveProperty('VehicleNumber');
    expect(loadingPayload).toMatchObject({
      ContainerNumber: 'CONT-LTA-WT01-0001',
      SealNumber: 'SEAL-LTA-WT01-20260701',
      LoadReference: 'LOAD-LTA-WT01-SEAL',
      ShipmentReference: 'LTA-WT01-SEAL-DEMO',
      TruckReference: 'TRUCK-LTA-WT01-0001',
      VehicleNumber: '51D-WT01',
    });
    expect(loadingPayload).not.toHaveProperty('GateOutReference');
    expect(goodsIssuePayload).toMatchObject({
      ContainerNumber: 'CONT-LTA-WT01-0001',
      SealNumber: 'SEAL-LTA-WT01-20260701',
      LoadReference: 'LOAD-LTA-WT01-SEAL',
      GateOutReference: 'GATEOUT-LTA-WT01-SEAL',
      ShipmentReference: 'LTA-WT01-SEAL-DEMO',
      TruckReference: 'TRUCK-LTA-WT01-0001',
      VehicleNumber: '51D-WT01',
    });
    expect(() =>
      BuildDemoDataCcFlowOutboxPayload({
        EventType: 'UnsupportedEvent' as never,
        Scenario: scenario,
        SourceId: 'unknown-id',
        UomCode: 'BOX',
      }),
    ).toThrow('Unsupported demo-data outbox event');
  });

  it('adds container and seal evidence refs only to lifecycle outbox events that carry container identity', () => {
    const scenario = BuildDemoDataCcFlowPlan().Scenarios[0];

    expect(BuildDemoDataCcFlowOutboxEvidenceRefs({ EventType: 'InboundImported', Scenario: scenario })).toEqual([
      'LTA-DEMO-WT01:InboundImported',
    ]);
    expect(BuildDemoDataCcFlowOutboxEvidenceRefs({ EventType: 'PackagePacked', Scenario: scenario })).toEqual([
      'LTA-DEMO-WT01:PackagePacked',
      'container:CONT-LTA-WT01-0001',
      'seal:SEAL-LTA-WT01-20260701',
    ]);
    expect(BuildDemoDataCcFlowOutboxEvidenceRefs({ EventType: 'LoadingConfirmed', Scenario: scenario })).toEqual([
      'LTA-DEMO-WT01:LoadingConfirmed',
      'container:CONT-LTA-WT01-0001',
      'seal:SEAL-LTA-WT01-20260701',
      'shipment:LTA-WT01-SEAL-DEMO',
      'truck:TRUCK-LTA-WT01-0001',
      'vehicle:51D-WT01',
      'load:LOAD-LTA-WT01-SEAL',
    ]);
    expect(BuildDemoDataCcFlowOutboxEvidenceRefs({ EventType: 'GoodsIssuePosted', Scenario: scenario })).toEqual([
      'LTA-DEMO-WT01:GoodsIssuePosted',
      'container:CONT-LTA-WT01-0001',
      'seal:SEAL-LTA-WT01-20260701',
      'shipment:LTA-WT01-SEAL-DEMO',
      'truck:TRUCK-LTA-WT01-0001',
      'vehicle:51D-WT01',
      'load:LOAD-LTA-WT01-SEAL',
      'gateout:GATEOUT-LTA-WT01-SEAL',
    ]);
    expect(() =>
      BuildDemoDataCcFlowOutboxEvidenceRefs({ EventType: 'UnsupportedEvent' as never, Scenario: scenario }),
    ).toThrow('Unsupported demo-data outbox event');
  });

  it('adds complete shipping evidence refs for shipment, truck, vehicle, load and gate-out', () => {
    const scenario = BuildDemoDataCcFlowPlan().Scenarios[0];

    expect(BuildDemoDataCcFlowShippingEvidenceRefs(scenario)).toEqual([
      'LTA-DEMO-WT01:shipping',
      'container:CONT-LTA-WT01-0001',
      'seal:SEAL-LTA-WT01-20260701',
      'shipment:LTA-WT01-SEAL-DEMO',
      'truck:TRUCK-LTA-WT01-0001',
      'vehicle:51D-WT01',
      'load:LOAD-LTA-WT01-SEAL',
      'gateout:GATEOUT-LTA-WT01-SEAL',
    ]);
  });

  it('cleans screen coverage rows before flow rows so FK-protected screen tasks do not block seed reruns', async () => {
    const manager = {
      connection: fakeLocalConnection,
      query: jest.fn().mockResolvedValue(undefined),
    };

    await CleanupDemoDataCcFlow(manager as never);

    const queries = manager.query.mock.calls.map(([query]) => String(query));
    const screenCleanupIndex = queries.findIndex((query) => query.includes('replenishment_tasks'));
    const flowBalanceCleanupIndex = queries.findIndex((query) => query.includes('inventory_balances'));

    expect(screenCleanupIndex).toBeGreaterThanOrEqual(0);
    expect(flowBalanceCleanupIndex).toBeGreaterThan(screenCleanupIndex);
  });

  it('keeps runtime flow cleanup scoped to LTA and legacy flow prefixes for inbound DEMO_FLOW rows', async () => {
    const manager = {
      connection: fakeLocalConnection,
      query: jest.fn().mockResolvedValue(undefined),
    };

    await CleanupDemoDataCcFlow(manager as never);

    const inboundPlanCalls = manager.query.mock.calls.filter(([query]) =>
      String(query).includes("source_document_type = 'DEMO_FLOW'"),
    );
    const lpnCalls = manager.query.mock.calls.filter(([query]) => String(query).includes('DELETE FROM inbound_lpns'));
    const sql = manager.query.mock.calls.map(([query]) => String(query)).join('\n');
    const inboundPlanSql = inboundPlanCalls.map(([query]) => String(query)).join('\n');
    const lpnSql = lpnCalls.map(([query]) => String(query)).join('\n');
    const params = JSON.stringify(inboundPlanCalls.map(([, values]) => values));
    const lpnParams = JSON.stringify(lpnCalls.map(([, values]) => values));

    expect(inboundPlanSql).toContain(
      '(business_reference = ANY($2::text[]) OR source_document_number = ANY($3::text[]))',
    );
    expect(lpnSql).toContain('idempotency_key = ANY($1::text[]) AND lpn_code = ANY($2::text[])');
    expect(sql).not.toContain("source_system = $1 AND source_document_type = 'DEMO_FLOW')");
    expect(sql).not.toContain('DELETE FROM inbound_lpns WHERE lpn_code LIKE $1');
    expect(params).toContain('LTA-DEMO-WT01-INB');
    expect(params).toContain('CC-DEMO-WT05-INB');
    expect(sql).not.toContain('business_reference LIKE');
    expect(sql).not.toContain('task_code LIKE');
    expect(lpnParams).toContain('LTA-FLOW-LPN-WT01');
    expect(lpnParams).toContain('CC-FLOW-LPN-WT01');
  });

  it('blocks exported cleanup when the actual manager connection is not a local demo target', async () => {
    const manager = {
      connection: {
        options: {
          host: 'prod.database.internal',
          port: 5432,
          database: 'backend_seed',
        },
      },
      query: jest.fn().mockResolvedValue(undefined),
    };

    await expect(CleanupDemoDataCcFlow(manager as never)).rejects.toThrow('not an allowed local target');
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('orders shipping outbox event times by lifecycle sequence', () => {
    const baseTime = new Date('2026-06-26T03:30:00.000Z');

    expect(GetDemoDataCcFlowOutboxEventTime(baseTime, 'PackagePacked').toISOString()).toBe('2026-06-26T03:47:00.000Z');
    expect(GetDemoDataCcFlowOutboxEventTime(baseTime, 'LoadingConfirmed').toISOString()).toBe(
      '2026-06-26T03:51:00.000Z',
    );
    expect(GetDemoDataCcFlowOutboxEventTime(baseTime, 'GoodsIssuePosted').toISOString()).toBe(
      '2026-06-26T03:54:00.000Z',
    );
    expect(() => GetDemoDataCcFlowOutboxEventTime(baseTime, 'UnsupportedEvent' as never)).toThrow(
      'Unsupported demo-data outbox event',
    );
  });
});
