import { QueryRunner } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreateTaskExecutionMobileTasks1781642600000 } from '@shared/Database/Migrations/1781642600000-CreateTaskExecutionMobileTasks';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('TaskExecution schema registration', () => {
  it('registers MobileTask ORM entity for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(expect.arrayContaining([MobileTaskOrmEntity]));
  });

  it('maps MobileTask ORM properties to the snake_case migration columns', () => {
    const columns = getMetadataArgsStorage().columns.filter((column) => column.target === MobileTaskOrmEntity);
    const columnNameByProperty = Object.fromEntries(
      columns.map((column) => [column.propertyName, column.options.name ?? column.propertyName]),
    );

    expect(columnNameByProperty).toMatchObject({
      Id: 'id',
      TaskCode: 'task_code',
      TaskStatus: 'task_status',
      WarehouseId: 'warehouse_id',
      AssignedUserId: 'assigned_user_id',
      TaskPayload: 'task_payload',
    });
  });

  it('creates mobile_tasks table and indexes for role/scope task shell queries', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateTaskExecutionMobileTasks1781642600000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "mobile_tasks"');
    expect(sql).toContain('"task_status" varchar(30) NOT NULL');
    expect(sql).toContain('"warehouse_id" char(36) NOT NULL');
    expect(sql).toContain('"assigned_user_id" char(36)');
    expect(sql).toContain('CREATE INDEX "IDX_mobile_tasks_scope_status_type"');
    expect(sql).toContain('CREATE INDEX "IDX_mobile_tasks_assignee_status"');
    expect(sql).not.toContain('inventory_status');
    expect(sql).not.toContain('GOODS_ISSUE_POSTED');
  });

  it('drops mobile task indexes and table in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateTaskExecutionMobileTasks1781642600000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX "public"."IDX_mobile_tasks_assignee_status"');
    expect(sql).toContain('DROP INDEX "public"."IDX_mobile_tasks_scope_status_type"');
    expect(sql).toContain('DROP TABLE "mobile_tasks"');
  });
});
