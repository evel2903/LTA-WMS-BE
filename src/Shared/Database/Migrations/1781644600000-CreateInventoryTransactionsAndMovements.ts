import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTransactionsAndMovements1781644600000 implements MigrationInterface {
  name = 'CreateInventoryTransactionsAndMovements1781644600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory_transactions" (
        "id" char(36) NOT NULL,
        "transaction_code" varchar(80) NOT NULL,
        "transaction_type" varchar(40) NOT NULL,
        "transaction_status" varchar(40) NOT NULL,
        "putaway_task_id" char(36) NOT NULL,
        "putaway_task_code" varchar(80) NOT NULL,
        "inventory_movement_id" char(36),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "quantity" numeric(18,4) NOT NULL,
        "from_inventory_status_code" varchar(80) NOT NULL,
        "to_inventory_status_code" varchar(80) NOT NULL,
        "from_location_id" char(36),
        "from_location_code" varchar(80),
        "to_location_id" char(36) NOT NULL,
        "to_location_code" varchar(80) NOT NULL,
        "lpn_code" varchar(80),
        "sscc_code" varchar(40),
        "idempotency_key" varchar(160) NOT NULL,
        "outbox_message_id" char(36),
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "posted_at" timestamptz NOT NULL,
        "posted_by" char(36),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" char(36) NOT NULL,
        "movement_code" varchar(80) NOT NULL,
        "movement_status" varchar(40) NOT NULL,
        "inventory_transaction_id" char(36) NOT NULL,
        "putaway_task_id" char(36) NOT NULL,
        "putaway_task_code" varchar(80) NOT NULL,
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "quantity" numeric(18,4) NOT NULL,
        "from_dimension_id" char(36) NOT NULL,
        "from_balance_id" char(36) NOT NULL,
        "from_location_id" char(36),
        "from_location_code" varchar(80),
        "from_inventory_status_code" varchar(80) NOT NULL,
        "to_dimension_id" char(36) NOT NULL,
        "to_balance_id" char(36) NOT NULL,
        "to_location_id" char(36) NOT NULL,
        "to_location_code" varchar(80) NOT NULL,
        "to_inventory_status_code" varchar(80) NOT NULL,
        "lpn_code" varchar(80),
        "sscc_code" varchar(40),
        "scan_evidence_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        CONSTRAINT "PK_inventory_movements" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inventory_transactions_code" ON "inventory_transactions" ("transaction_code")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inventory_movements_code" ON "inventory_movements" ("movement_code")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_inventory_transactions_idempotency"
      ON "inventory_transactions" ("putaway_task_id", "idempotency_key")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_transactions_scope_status"
      ON "inventory_transactions" ("warehouse_id", "owner_id", "transaction_status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_transactions_putaway_task"
      ON "inventory_transactions" ("putaway_task_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_movements_transaction"
      ON "inventory_movements" ("inventory_transaction_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_movements_putaway_task"
      ON "inventory_movements" ("putaway_task_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_movements_from_dimension"
      ON "inventory_movements" ("from_dimension_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_movements_to_dimension"
      ON "inventory_movements" ("to_dimension_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_transactions"
      ADD CONSTRAINT "FK_inventory_transactions_putaway_task"
      FOREIGN KEY ("putaway_task_id") REFERENCES "putaway_tasks"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "FK_inventory_movements_transaction"
      FOREIGN KEY ("inventory_transaction_id") REFERENCES "inventory_transactions"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "FK_inventory_movements_putaway_task"
      FOREIGN KEY ("putaway_task_id") REFERENCES "putaway_tasks"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "FK_inventory_movements_from_dimension"
      FOREIGN KEY ("from_dimension_id") REFERENCES "inventory_dimensions"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "FK_inventory_movements_to_dimension"
      FOREIGN KEY ("to_dimension_id") REFERENCES "inventory_dimensions"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "FK_inventory_movements_from_balance"
      FOREIGN KEY ("from_balance_id") REFERENCES "inventory_balances"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "FK_inventory_movements_to_balance"
      FOREIGN KEY ("to_balance_id") REFERENCES "inventory_balances"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_to_balance"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_from_balance"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_to_dimension"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_from_dimension"`,
    );
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_putaway_task"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_transaction"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_inventory_transactions_putaway_task"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_movements_to_dimension"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_movements_from_dimension"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_movements_putaway_task"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_movements_transaction"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_transactions_putaway_task"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_transactions_scope_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_inventory_transactions_idempotency"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_inventory_movements_code"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_inventory_transactions_code"`);
    await queryRunner.query(`DROP TABLE "inventory_movements"`);
    await queryRunner.query(`DROP TABLE "inventory_transactions"`);
  }
}
