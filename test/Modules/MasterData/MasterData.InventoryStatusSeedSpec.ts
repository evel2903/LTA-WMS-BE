import { CreateInventoryStatusDimensionBalance1781626000000 } from '@shared/Database/Migrations/1781626000000-CreateInventoryStatusDimensionBalance';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { getMetadataArgsStorage } from 'typeorm';

const ExpectedStatusCodes = [
  'PENDING_RECEIPT',
  'PENDING_QC',
  'READY_FOR_PUTAWAY',
  'READY_FOR_CROSS_DOCK',
  'READY_FOR_RECEIVING',
  'AVAILABLE',
  'HOLD',
  'QUARANTINE',
  'DAMAGED',
  'REJECTED',
  'COUNTING_LOCKED',
  'IN_TRANSIT',
  'ALLOCATED',
  'RELEASED',
  'PICK_IN_PROGRESS',
  'PICKED',
  'CHECK_EXCEPTION',
  'PACKED',
  'READY_FOR_STAGING',
  'STAGED',
  'LOADING_IN_PROGRESS',
  'LOADED',
  'RETURNED',
  'INSPECTED',
  'HOLD_RETURN',
  'REWORK_PENDING',
  'SCRAPPED_DISPOSED',
  'RETURNED_TO_VENDOR',
];

describe('Inventory status catalog seed', () => {
  it('defines InventoryStatus ORM metadata with a globally unique status code', () => {
    const columns = getMetadataArgsStorage()
      .columns.filter((column) => column.target === InventoryStatusOrmEntity)
      .map((column) => column.propertyName);
    const uniqueDefinitions = getMetadataArgsStorage().uniques.filter(
      (unique) => unique.target === InventoryStatusOrmEntity,
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        'StatusCode',
        'DisplayName',
        'StageGroup',
        'AllowsAllocation',
        'AllowsPick',
        'IsTerminal',
        'IsMilestone',
        'SortOrder',
        'Status',
      ]),
    );
    expect(uniqueDefinitions.some((unique) => JSON.stringify(unique.columns).includes('StatusCode'))).toBe(true);
  });

  it('seeds the V0 inventory status superset and excludes transaction milestones', async () => {
    const migration = new CreateInventoryStatusDimensionBalance1781626000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n');
    for (const statusCode of ExpectedStatusCodes) {
      expect(sql).toContain(statusCode);
    }
    expect(sql).not.toContain('SHIPPED');
    expect(sql).not.toContain('GATE_OUT');
    expect(sql).not.toContain('GOODS_ISSUE_POSTED');
    expect(sql).not.toContain('QC_PASSED');
    expect(sql).not.toContain('QC_REJECTED');
    expect(sql).toContain("'AVAILABLE', 'Available', 'StorageControl', true");
    expect(sql).toContain("'HOLD', 'Hold', 'StorageControl', false");
    expect(sql).toContain("'QUARANTINE', 'Quarantine', 'StorageControl', false");
    expect(sql).toContain("'DAMAGED', 'Damaged', 'StorageControl', false");
    expect(sql).toContain("'READY_FOR_RECEIVING', 'Ready for Receiving', 'Inbound', false, false, false, true");
    expect(sql).toContain("'SCRAPPED_DISPOSED', 'Scrapped/Disposed', 'Returns', false, false, true");
    expect(sql).toContain("'RETURNED_TO_VENDOR', 'Returned to Vendor', 'Returns', false, false, true");
  });
});
