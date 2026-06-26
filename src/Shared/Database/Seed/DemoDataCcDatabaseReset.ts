import type { DataSource } from 'typeorm';

export const DemoDataCcProtectedTables = ['migrations'] as const;

export type DemoDataCcResetResult = {
  TruncatedTables: string[];
  ProtectedTables: string[];
};

export const QuotePostgresIdentifier = (identifier: string): string => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error('Postgres identifier must not be empty.');
  }
  return `"${trimmed.replace(/"/g, '""')}"`;
};

export const BuildDemoDataCcTruncateSql = (tableNames: string[]): string | null => {
  const protectedTables = new Set<string>(DemoDataCcProtectedTables);
  const resetTables = tableNames
    .map((tableName) => tableName.trim())
    .filter((tableName) => tableName.length > 0 && !protectedTables.has(tableName))
    .sort();

  if (resetTables.length === 0) {
    return null;
  }

  const tableList = resetTables.map((tableName) => `public.${QuotePostgresIdentifier(tableName)}`).join(', ');
  return `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`;
};

export const ListDemoDataCcResetTables = async (dataSource: DataSource): Promise<string[]> => {
  const rows = await dataSource.query<Array<{ tablename: string }>>(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> ALL($1::text[])
      ORDER BY tablename
    `,
    [DemoDataCcProtectedTables],
  );

  return rows.map((row) => row.tablename);
};

export const ResetDemoDataCcLocalDatabase = async (dataSource: DataSource): Promise<DemoDataCcResetResult> => {
  const tables = await ListDemoDataCcResetTables(dataSource);
  const truncateSql = BuildDemoDataCcTruncateSql(tables);

  if (truncateSql) {
    await dataSource.query(truncateSql);
  }

  return {
    TruncatedTables: tables,
    ProtectedTables: [...DemoDataCcProtectedTables],
  };
};
