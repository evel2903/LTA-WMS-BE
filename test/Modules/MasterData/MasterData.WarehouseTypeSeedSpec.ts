import { CreateWarehouseTypes1781718000000 } from '@shared/Database/Migrations/1781718000000-CreateWarehouseTypes';
import { WarehouseTypeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseTypeOrmEntity';
import { getMetadataArgsStorage } from 'typeorm';

const ExpectedWarehouseTypes = ['WT-01', 'WT-02', 'WT-03', 'WT-04', 'WT-05', 'WT-06', 'WT-07', 'WT-08'];

describe('Warehouse type catalog seed', () => {
  it('defines WarehouseType ORM metadata with a globally unique code', () => {
    const columns = getMetadataArgsStorage()
      .columns.filter((column) => column.target === WarehouseTypeOrmEntity)
      .map((column) => column.propertyName);
    const uniqueDefinitions = getMetadataArgsStorage().uniques.filter(
      (unique) => unique.target === WarehouseTypeOrmEntity,
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        'WarehouseTypeCode',
        'WarehouseTypeName',
        'Description',
        'Status',
        'SourceSystem',
        'ReferenceId',
      ]),
    );
    expect(uniqueDefinitions.some((unique) => JSON.stringify(unique.columns).includes('WarehouseTypeCode'))).toBe(true);
  });

  it('creates warehouse_types and seeds WT-01..WT-08 without warehouse FK coupling', async () => {
    const migration = new CreateWarehouseTypes1781718000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n');
    expect(sql.toLowerCase()).toContain('create table if not exists "warehouse_types"');
    expect(sql.toLowerCase()).toContain('unique ("warehouse_type_code")');
    for (const code of ExpectedWarehouseTypes) {
      expect(sql).toContain(code);
    }
    expect(sql).not.toContain('FOREIGN KEY');
    expect(sql).toContain('ON CONFLICT ("warehouse_type_code") DO UPDATE');
  });
});
