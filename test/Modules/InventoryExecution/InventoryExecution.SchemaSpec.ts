import { QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreatePutawayTasks1781644500000 } from '@shared/Database/Migrations/1781644500000-CreatePutawayTasks';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { PutawayTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/PutawayTaskOrmEntity';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('InventoryExecution schema registration', () => {
  it('registers putaway task ORM entity for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(expect.arrayContaining([PutawayTaskOrmEntity]));
  });

  it('creates putaway task table and indexes without adding InventoryStatus terms', async () => {
    const { runner, queries } = fakeRunner();
    await new CreatePutawayTasks1781644500000().up(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('CREATE TABLE "putaway_tasks"');
    expect(sql).toContain('"inventory_status_code" varchar(80) NOT NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_putaway_tasks_inbound_release"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_putaway_tasks_idempotency"');
    expect(sql).toContain('CREATE INDEX "IDX_putaway_tasks_scope_status"');
    expect(sql).toContain('CREATE INDEX "IDX_putaway_tasks_target_location"');
    expect(sql).toContain('"task_status" varchar(40) NOT NULL');
    expect(sql).not.toContain('PUTAWAY_RELEASED');
    expect(sql).not.toContain('PUTAWAY_IN_PROGRESS');
    expect(sql).not.toContain('STORED');
    expect(sql).not.toContain('SHIPPED');
    expect(sql).not.toContain('GATE_OUT');
    expect(sql).not.toContain('GOODS_ISSUE_POSTED');
  });

  it('drops putaway task table and indexes in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreatePutawayTasks1781644500000().down(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('DROP INDEX "public"."IDX_putaway_tasks_target_location"');
    expect(sql).toContain('DROP INDEX "public"."IDX_putaway_tasks_scope_status"');
    expect(sql).toContain('DROP INDEX "public"."UQ_putaway_tasks_idempotency"');
    expect(sql).toContain('DROP INDEX "public"."UQ_putaway_tasks_inbound_release"');
    expect(sql).toContain('DROP TABLE "putaway_tasks"');
  });

  it('keeps putaway task status separate from InventoryStatus terms', () => {
    expect(Object.values(PutawayTaskStatus)).toEqual([
      'Created',
      'Released',
      'InProgress',
      'Confirmed',
      'Exception',
      'Cancelled',
    ]);
    expect(Object.values(PutawayTaskStatus)).not.toEqual(
      expect.arrayContaining([
        'PUTAWAY_RELEASED',
        'PUTAWAY_IN_PROGRESS',
        'STORED',
        'SHIPPED',
        'GATE_OUT',
        'GOODS_ISSUE_POSTED',
      ]),
    );
  });
});
