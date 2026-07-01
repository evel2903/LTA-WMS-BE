import {
  CleanupLegacyDemoDataCcFlowRows,
  CleanupLegacyDemoDataCcMasterRows,
  CleanupLegacyDemoDataCcScreenRows,
} from '@shared/Database/Seed/DemoDataCcLegacyCleanup';

describe('DemoDataCcSeed legacy cleanup', () => {
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

  const fakeManager = (): {
    connection: typeof fakeLocalConnection;
    query: jest.Mock<Promise<unknown>, [string, unknown[]?]>;
  } => ({
    connection: fakeLocalConnection,
    query: jest.fn().mockResolvedValue(undefined),
  });

  it('keeps legacy flow cleanup scoped to the old demo flow instead of deleting every DEMO-DATA-CC row', async () => {
    const manager = fakeManager();

    await CleanupLegacyDemoDataCcFlowRows(manager as never);

    const sql = manager.query.mock.calls.map(([query]) => query).join('\n');
    expect(sql).toContain('source_system = $1 AND business_reference = ANY($2::text[])');
    expect(sql).toContain("source_system = $1 AND source_document_type = 'DEMO_FLOW'");
    expect(sql).toContain('idempotency_key = ANY($1::text[]) AND lpn_code = ANY($2::text[])');
    expect(sql).not.toContain('source_system = $1 OR');
    expect(sql).not.toContain('DELETE FROM inbound_lpns WHERE lpn_code LIKE $1');
    expect(sql).not.toContain('business_reference LIKE');
    expect(sql).not.toContain('task_code LIKE');
  });

  it('checks legacy append-only screen rows before deleting mutable legacy screen rows', async () => {
    const manager = {
      connection: fakeLocalConnection,
      query: jest
        .fn()
        .mockResolvedValueOnce([{ Count: 1 }])
        .mockResolvedValueOnce([{ Count: 0 }]),
    };

    await expect(CleanupLegacyDemoDataCcScreenRows(manager as never)).rejects.toThrow('demo-data:prepare');
    const queries = manager.query.mock.calls.map(([query]) => String(query).trim().toUpperCase());
    expect(queries.some((query) => query.startsWith('DELETE'))).toBe(false);
  });

  it('uses explicit legacy demo master-data identifiers instead of broad CC business prefixes', async () => {
    const manager = fakeManager();

    await CleanupLegacyDemoDataCcMasterRows(manager as never);

    const calls = manager.query.mock.calls;
    const sql = calls.map(([query]) => query).join('\n');
    const params = JSON.stringify(calls.map(([, values]) => values));

    expect(sql).not.toMatch(/LIKE 'CC-%'|sku_code LIKE 'CC-%'|lpn_code LIKE 'CC-%'|reference_id LIKE 'CC-%'/);
    expect(sql).toContain('inventory_balances WHERE source_system = $2');
    expect(sql).toContain('inventory_dimensions WHERE source_system = $2');
    expect(sql).toContain('DELETE FROM uoms u');
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM inventory_dimensions d WHERE d.uom_id = u.id)');
    expect(sql).toContain('DELETE FROM inventory_statuses s');
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM inventory_dimensions d WHERE d.inventory_status_id = s.id)');
    expect(sql).toContain('location_code = ANY($2::text[]) AND warehouse_id IN');
    expect(params).toContain('CC-COKE-330-CAN');
    expect(params).toContain('CC-SPRITE-330-CAN');
    expect(params).toContain('CC-FANTA-330-CAN');
    expect(params).toContain('CC-LPN-0001');
    expect(params).toContain('CC-SOUTH');
    expect(params).toContain('PALLET');
    expect(params).not.toContain('CC-NONDEMO-KEEP');
  });

  it('fails seed-only cleanup when legacy catalog rows are still referenced outside old demo scope', async () => {
    const manager = {
      connection: fakeLocalConnection,
      query: jest.fn((query: string) =>
        Promise.resolve(
          query.includes('UomCount') && query.includes('StatusCount') ? [{ UomCount: 1, StatusCount: 0 }] : undefined,
        ),
      ),
    };

    await expect(CleanupLegacyDemoDataCcMasterRows(manager as never)).rejects.toThrow(
      'legacy DEMO-DATA-CC catalog rows',
    );
  });
});
