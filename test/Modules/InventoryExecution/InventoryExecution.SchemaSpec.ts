import { QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreateInventoryTransactionsAndMovements1781644600000 } from '@shared/Database/Migrations/1781644600000-CreateInventoryTransactionsAndMovements';
import { RelaxInventoryControlLedgerForNonPutaway1781644700000 } from '@shared/Database/Migrations/1781644700000-RelaxInventoryControlLedgerForNonPutaway';
import { CreatePutawayTasks1781644500000 } from '@shared/Database/Migrations/1781644500000-CreatePutawayTasks';
import { InventoryMovementStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryMovementStatus';
import { InventoryTransactionStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionStatus';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { InventoryMovementOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryMovementOrmEntity';
import { InventoryTransactionOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryTransactionOrmEntity';
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

  it('registers inventory transaction and movement ORM entities for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(
      expect.arrayContaining([InventoryTransactionOrmEntity, InventoryMovementOrmEntity]),
    );
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
    expect(sql).not.toContain('PUTAWAY_CONFIRMED');
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

  it('creates inventory transaction and movement tables without adding InventoryStatus milestones', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInventoryTransactionsAndMovements1781644600000().up(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('CREATE TABLE "inventory_transactions"');
    expect(sql).toContain('CREATE TABLE "inventory_movements"');
    expect(sql).toContain('"from_inventory_status_code" varchar(80) NOT NULL');
    expect(sql).toContain('"to_inventory_status_code" varchar(80) NOT NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inventory_transactions_idempotency"');
    expect(sql).toContain('CREATE INDEX "IDX_inventory_movements_to_dimension"');
    expect(sql).toContain('ADD CONSTRAINT "FK_inventory_transactions_putaway_task"');
    expect(sql).toContain('ADD CONSTRAINT "FK_inventory_movements_transaction"');
    expect(sql).toContain('ADD CONSTRAINT "FK_inventory_movements_from_balance"');
    expect(sql).not.toContain('STORED');
    expect(sql).not.toContain('PUTAWAY_CONFIRMED');
    expect(sql).not.toContain('SHIPPED');
    expect(sql).not.toContain('GATE_OUT');
    expect(sql).not.toContain('GOODS_ISSUE_POSTED');
  });

  it('drops inventory transaction and movement tables and indexes in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateInventoryTransactionsAndMovements1781644600000().down(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('DROP INDEX "public"."IDX_inventory_movements_to_dimension"');
    expect(sql).toContain('DROP CONSTRAINT "FK_inventory_movements_to_balance"');
    expect(sql).toContain('DROP CONSTRAINT "FK_inventory_transactions_putaway_task"');
    expect(sql).toContain('DROP INDEX "public"."IDX_inventory_movements_from_dimension"');
    expect(sql).toContain('DROP INDEX "public"."IDX_inventory_transactions_scope_status"');
    expect(sql).toContain('DROP INDEX "public"."UQ_inventory_transactions_idempotency"');
    expect(sql).toContain('DROP TABLE "inventory_movements"');
    expect(sql).toContain('DROP TABLE "inventory_transactions"');
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
        'PUTAWAY_CONFIRMED',
        'STORED',
        'SHIPPED',
        'GATE_OUT',
        'GOODS_ISSUE_POSTED',
      ]),
    );
  });

  it('keeps V1-14 transaction and movement statuses separate from InventoryStatus terms', () => {
    expect(Object.values(InventoryTransactionType)).toEqual(['PutawayConfirm', 'StatusChange', 'InternalMove']);
    expect(Object.values(InventoryTransactionStatus)).toEqual(['Posted', 'Failed']);
    expect(Object.values(InventoryMovementStatus)).toEqual(['Posted']);
    expect([
      ...Object.values(InventoryTransactionType),
      ...Object.values(InventoryTransactionStatus),
      ...Object.values(InventoryMovementStatus),
    ]).not.toEqual(
      expect.arrayContaining(['PUTAWAY_CONFIRMED', 'STORED', 'SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED']),
    );
  });

  it('relaxes inventory ledger putaway reference for V1-15 non-putaway control operations', async () => {
    const { runner, queries } = fakeRunner();
    await new RelaxInventoryControlLedgerForNonPutaway1781644700000().up(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('ALTER TABLE "inventory_transactions" ALTER COLUMN "putaway_task_id" DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE "inventory_movements" ALTER COLUMN "putaway_task_id" DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE "inventory_transactions" ALTER COLUMN "uom_id" DROP NOT NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_inventory_transactions_operation_idempotency_no_task"');
    expect(sql).toContain('WHERE "putaway_task_id" IS NULL');
    expect(sql).not.toContain('STORED');
    expect(sql).not.toContain('SHIPPED');
    expect(sql).not.toContain('GATE_OUT');
    expect(sql).not.toContain('GOODS_ISSUE_POSTED');
  });

  it('reverts V1-15 inventory ledger relaxation in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new RelaxInventoryControlLedgerForNonPutaway1781644700000().down(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('DROP INDEX "public"."UQ_inventory_transactions_operation_idempotency_no_task"');
    expect(sql).toContain('ALTER TABLE "inventory_movements" ALTER COLUMN "putaway_task_id" SET NOT NULL');
    expect(sql).toContain('ALTER TABLE "inventory_transactions" ALTER COLUMN "putaway_task_id" SET NOT NULL');
  });
});
