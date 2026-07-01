import {
  AssertDemoDataCcScreenCoverageCurrentAppendOnlyRows,
  AssertDemoDataCcScreenCoverageSourceConsistency,
  AssertDemoDataCcScreenCoverageStockIdentity,
  AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows,
  BuildDemoDataCcScreenCoveragePlan,
  BuildDemoDataCcScreenCoverageGovernanceLinkage,
  CleanupDemoDataCcScreenCoverage,
  DemoDataCcScreenCoverageAuditLogId,
  DemoDataCcScreenCoverageOverrideLogId,
  DemoDataCcScreenCoverageExpiryDate,
  DemoDataCcScreenCoverageFlowReference,
  DemoDataCcScreenCoverageLpnCode,
  DemoDataCcScreenCoverageLotNumber,
  DemoDataCcScreenCoverageScenarioQuantity,
  DemoDataCcScreenCoverageScenarioCode,
  DemoDataCcScreenCoverageTables,
  FormatDemoDataCcScreenCoverageDate,
  ResolveDemoDataCcScreenCoverageQuantity,
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

  it('targets WT-01 flow rows for label and RF/mobile screen coverage', () => {
    expect(DemoDataCcScreenCoverageScenarioCode).toBe('WT-01');
    expect(DemoDataCcScreenCoverageFlowReference).toBe('LTA-DEMO-WT01');
    expect(DemoDataCcScreenCoverageLpnCode).toBe('LTA-FLOW-LPN-WT01');
    expect(DemoDataCcScreenCoverageLotNumber).toBe('LTA-FLOW-BATCH-WT01');
    expect(DemoDataCcScreenCoverageExpiryDate).toBe('2026-09-30');
  });

  it('links override and audit rows with the same correlation contract as runtime overrides', () => {
    expect(BuildDemoDataCcScreenCoverageGovernanceLinkage()).toEqual({
      OverrideAuditRef: 'DEMO-DATA-LTA-SCREEN-COVERAGE',
      AuditReferenceType: 'OverrideLog',
      AuditReferenceId: DemoDataCcScreenCoverageOverrideLogId,
    });
  });

  it('fails seed-only replacement when legacy append-only audit or override rows still exist', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ Count: 1 }])
        .mockResolvedValueOnce([{ Count: 0 }]),
    };

    await expect(AssertNoLegacyDemoDataCcScreenCoverageAppendOnlyRows(manager as never)).rejects.toThrow(
      'demo-data:prepare',
    );
  });

  it('checks legacy append-only rows before deleting mutable screen coverage rows', async () => {
    const previousEnv = {
      DB_DATABASE: process.env.DB_DATABASE,
      DB_HOST: process.env.DB_HOST,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_PORT: process.env.DB_PORT,
      DB_USERNAME: process.env.DB_USERNAME,
      JWT_EXPIRATION: process.env.JWT_EXPIRATION,
      JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_SECRET: process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    };
    Object.assign(process.env, {
      DB_DATABASE: 'backend_seed',
      DB_HOST: 'localhost',
      DB_PASSWORD: 'postgres',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'development',
      PORT: '3000',
    });
    delete process.env.JWT_REFRESH_EXPIRATION;

    const manager = {
      connection: {
        options: {
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          database: 'backend_seed',
        },
      },
      query: jest
        .fn()
        .mockResolvedValueOnce([{ Count: 1 }])
        .mockResolvedValueOnce([{ Count: 0 }]),
    };

    try {
      await expect(CleanupDemoDataCcScreenCoverage(manager as never)).rejects.toThrow('demo-data:prepare');
      const queries = manager.query.mock.calls.map(([query]) => String(query).trim().toUpperCase());
      expect(queries.some((query) => query.startsWith('DELETE'))).toBe(false);
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it('validates fixed LTA append-only rows after ON CONFLICT inserts', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            RuleId: '11111111-1111-4111-8111-111111111205',
            ActorUserId: 'admin-user-id',
            Action: 'Override',
            TargetObjectType: 'InboundPlan',
            TargetObjectId: 'LTA-DEMO-WT01-INB',
            TargetObjectCode: 'LTA-DEMO-WT01-INB',
            Scope: { warehouseCode: 'LTA-HCM-01', ownerCode: 'LTA' },
            ControlMode: 'APPROVAL_REQUIRED',
            BeforeJson: { allowed: false },
            AfterJson: { allowed: true, overrideAccepted: true },
            AuditRef: 'DEMO-DATA-LTA-SCREEN-COVERAGE',
            CorrelationId: 'DEMO-DATA-LTA-SCREEN-COVERAGE',
            EvidenceRefs: ['LTA-SCREEN-DEMO:override'],
          },
        ])
        .mockResolvedValueOnce([
          {
            ActorUserId: 'admin-user-id',
            Action: 'Override',
            ObjectType: 'InboundPlan',
            ObjectId: 'LTA-DEMO-WT01-INB',
            ObjectCode: 'LTA-DEMO-WT01-INB',
            BeforeJson: { allowed: false },
            AfterJson: { allowed: true, overrideAccepted: true },
            ReferenceType: 'OverrideLog',
            ReferenceId: DemoDataCcScreenCoverageOverrideLogId,
            WarehouseId: 'warehouse-id',
            OwnerId: 'owner-id',
            ScopeJson: { warehouseCode: 'LTA-HCM-01', ownerCode: 'LTA' },
            CorrelationId: 'DEMO-DATA-LTA-SCREEN-COVERAGE',
            RequestId: 'LTA-SCREEN-DEMO-REQ',
            UserAgent: 'DEMO-DATA-LTA-SEED',
            EvidenceRefs: ['LTA-SCREEN-DEMO:audit'],
            Result: 'SUCCESS',
          },
        ]),
    };

    await expect(AssertDemoDataCcScreenCoverageCurrentAppendOnlyRows(manager as never)).resolves.toBeUndefined();
    expect(manager.query.mock.calls[0][1]).toEqual([DemoDataCcScreenCoverageOverrideLogId]);
    expect(manager.query.mock.calls[1][1]).toEqual([DemoDataCcScreenCoverageAuditLogId]);
  });

  it('rejects stale fixed LTA append-only linkage on rerun', async () => {
    const manager = {
      query: jest.fn().mockResolvedValueOnce([
        {
          RuleId: '11111111-1111-4111-8111-111111111205',
          ActorUserId: 'admin-user-id',
          Action: 'Override',
          TargetObjectType: 'InboundPlan',
          TargetObjectId: 'LTA-DEMO-WT01-INB',
          TargetObjectCode: 'LTA-DEMO-WT01-INB',
          Scope: { warehouseCode: 'LTA-HCM-01', ownerCode: 'LTA' },
          ControlMode: 'APPROVAL_REQUIRED',
          BeforeJson: { allowed: false },
          AfterJson: { allowed: true, overrideAccepted: true },
          AuditRef: '22222222-2222-4222-8222-222222222105',
          CorrelationId: 'DEMO-DATA-LTA-SCREEN-COVERAGE',
          EvidenceRefs: ['LTA-SCREEN-DEMO:override'],
        },
      ]),
    };

    await expect(AssertDemoDataCcScreenCoverageCurrentAppendOnlyRows(manager as never)).rejects.toThrow(
      'stale override log linkage',
    );
  });

  it('requires package content, pick task and source dimension to describe the same WT-01 stock', () => {
    const input = {
      PackageContent: {
        SkuId: 'sku-1',
        UomId: 'uom-1',
      },
      PickTask: {
        SkuId: 'sku-1',
        UomId: 'uom-1',
        SourceLocationId: 'loc-1',
      },
      SourceDimension: {
        SkuId: 'sku-1',
        UomId: 'uom-1',
        LocationId: 'loc-1',
        LpnCode: DemoDataCcScreenCoverageLpnCode,
      },
    };

    expect(AssertDemoDataCcScreenCoverageSourceConsistency(input)).toBe(DemoDataCcScreenCoverageLpnCode);
    expect(() =>
      AssertDemoDataCcScreenCoverageSourceConsistency({
        ...input,
        SourceDimension: { ...input.SourceDimension, SkuId: 'sku-2' },
      }),
    ).toThrow('SKU');
    expect(() =>
      AssertDemoDataCcScreenCoverageSourceConsistency({
        ...input,
        SourceDimension: { ...input.SourceDimension, UomId: 'uom-2' },
      }),
    ).toThrow('UOM');
    expect(() =>
      AssertDemoDataCcScreenCoverageSourceConsistency({
        ...input,
        SourceDimension: { ...input.SourceDimension, UomId: null },
      }),
    ).toThrow('UOM');
    expect(() =>
      AssertDemoDataCcScreenCoverageSourceConsistency({
        ...input,
        SourceDimension: { ...input.SourceDimension, LocationId: 'loc-2' },
      }),
    ).toThrow('source location');
    expect(() =>
      AssertDemoDataCcScreenCoverageSourceConsistency({
        ...input,
        SourceDimension: { ...input.SourceDimension, LpnCode: 'LTA-FLOW-LPN-WT99' },
      }),
    ).toThrow(DemoDataCcScreenCoverageLpnCode);
  });

  it('formats demo coverage dates without timezone shifts and rejects invalid calendar dates', () => {
    const utcMidnightOnNegativeOffsetHost = {
      getTime: () => Date.UTC(2026, 8, 30),
      getUTCHours: () => 0,
      getUTCMinutes: () => 0,
      getUTCSeconds: () => 0,
      getUTCMilliseconds: () => 0,
      getUTCFullYear: () => 2026,
      getUTCMonth: () => 8,
      getUTCDate: () => 30,
      getFullYear: () => 2026,
      getMonth: () => 8,
      getDate: () => 29,
    } as Date;

    expect(FormatDemoDataCcScreenCoverageDate('2026-09-30', 'expiry')).toBe('2026-09-30');
    expect(FormatDemoDataCcScreenCoverageDate(new Date(2026, 8, 30), 'expiry')).toBe('2026-09-30');
    expect(FormatDemoDataCcScreenCoverageDate(utcMidnightOnNegativeOffsetHost, 'expiry')).toBe('2026-09-30');
    expect(() => FormatDemoDataCcScreenCoverageDate('2026-99-99', 'expiry')).toThrow('YYYY-MM-DD');
    expect(() => FormatDemoDataCcScreenCoverageDate(new Date('invalid'), 'expiry')).toThrow('valid date');
  });

  it('requires the current WT-01 stock identity for lot and expiry', () => {
    expect(() =>
      AssertDemoDataCcScreenCoverageStockIdentity({
        LotNumber: DemoDataCcScreenCoverageLotNumber,
        ExpiryDate: DemoDataCcScreenCoverageExpiryDate,
      }),
    ).not.toThrow();
    expect(() =>
      AssertDemoDataCcScreenCoverageStockIdentity({
        LotNumber: 'LTA-FLOW-BATCH-OLD',
        ExpiryDate: DemoDataCcScreenCoverageExpiryDate,
      }),
    ).toThrow(DemoDataCcScreenCoverageLotNumber);
    expect(() =>
      AssertDemoDataCcScreenCoverageStockIdentity({
        LotNumber: DemoDataCcScreenCoverageLotNumber,
        ExpiryDate: '2026-10-30',
      }),
    ).toThrow(DemoDataCcScreenCoverageExpiryDate);
  });

  it('derives screen coverage quantity from the WT-01 pick task quantity', () => {
    expect(ResolveDemoDataCcScreenCoverageQuantity({ Quantity: '12.0000' })).toBe(
      DemoDataCcScreenCoverageScenarioQuantity,
    );
    expect(() => ResolveDemoDataCcScreenCoverageQuantity({ Quantity: 24 })).toThrow('WT-01 quantity 12');
    expect(() => ResolveDemoDataCcScreenCoverageQuantity({ Quantity: 0 })).toThrow('positive WT-01 quantity');
  });
});
