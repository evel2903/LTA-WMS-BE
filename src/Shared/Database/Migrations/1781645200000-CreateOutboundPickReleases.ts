import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboundPickReleases1781645200000 implements MigrationInterface {
  public name = 'CreateOutboundPickReleases1781645200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "outbound_pick_releases" (
        "id" char(36) NOT NULL,
        "release_number" varchar(80) NOT NULL,
        "outbound_order_id" char(36) NOT NULL,
        "allocation_id" char(36) NOT NULL,
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "release_mode" varchar(40) NOT NULL,
        "batch_size" integer NOT NULL,
        "status" varchar(40) NOT NULL,
        "block_reason" text,
        "total_task_count" integer NOT NULL,
        "total_released_quantity" numeric(18,4) NOT NULL,
        "outbox_message_id" char(36),
        "idempotency_key" varchar(180) NOT NULL,
        "payload_fingerprint" varchar(64) NOT NULL,
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_outbound_pick_releases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_outbound_pick_releases_order" FOREIGN KEY ("outbound_order_id")
          REFERENCES "outbound_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_pick_releases_allocation" FOREIGN KEY ("allocation_id")
          REFERENCES "outbound_allocations"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_outbound_pick_releases_qty_non_negative" CHECK (
          "total_task_count" >= 0 AND "total_released_quantity" >= 0
        ),
        CONSTRAINT "CHK_outbound_pick_releases_batch_size" CHECK ("batch_size" >= 1 AND "batch_size" <= 100)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "outbound_pick_tasks" (
        "id" char(36) NOT NULL,
        "pick_release_id" char(36) NOT NULL,
        "outbound_order_id" char(36) NOT NULL,
        "allocation_id" char(36) NOT NULL,
        "allocation_line_id" char(36) NOT NULL,
        "outbound_order_line_id" char(36) NOT NULL,
        "task_number" varchar(80) NOT NULL,
        "status" varchar(40) NOT NULL,
        "sequence" integer NOT NULL,
        "batch_number" varchar(80),
        "source_balance_id" char(36) NOT NULL,
        "source_dimension_id" char(36) NOT NULL,
        "source_location_id" char(36) NOT NULL,
        "target_location_id" char(36),
        "target_reference" varchar(180),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "quantity" numeric(18,4) NOT NULL,
        "inventory_status_code" varchar(50),
        "lot_number" varchar(100),
        "serial_number" varchar(100),
        "expiry_date" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbound_pick_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_outbound_pick_tasks_release" FOREIGN KEY ("pick_release_id")
          REFERENCES "outbound_pick_releases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_outbound_pick_tasks_order" FOREIGN KEY ("outbound_order_id")
          REFERENCES "outbound_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_pick_tasks_allocation" FOREIGN KEY ("allocation_id")
          REFERENCES "outbound_allocations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_pick_tasks_allocation_line" FOREIGN KEY ("allocation_line_id")
          REFERENCES "outbound_allocation_lines"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_pick_tasks_order_line" FOREIGN KEY ("outbound_order_line_id")
          REFERENCES "outbound_order_lines"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_pick_tasks_balance" FOREIGN KEY ("source_balance_id")
          REFERENCES "inventory_balances"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_pick_tasks_dimension" FOREIGN KEY ("source_dimension_id")
          REFERENCES "inventory_dimensions"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_outbound_pick_tasks_qty_positive" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_outbound_pick_tasks_sequence_positive" CHECK ("sequence" >= 1)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_outbound_pick_releases_idempotency" ON "outbound_pick_releases" ("idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_pick_releases_order_status" ON "outbound_pick_releases" ("outbound_order_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_pick_releases_scope_status" ON "outbound_pick_releases" ("warehouse_id", "owner_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_pick_tasks_release" ON "outbound_pick_tasks" ("pick_release_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_pick_tasks_order_status" ON "outbound_pick_tasks" ("outbound_order_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_pick_tasks_source_location" ON "outbound_pick_tasks" ("source_location_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_pick_tasks_source_location"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_pick_tasks_order_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_pick_tasks_release"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_pick_releases_scope_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_pick_releases_order_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_outbound_pick_releases_idempotency"`);
    await queryRunner.query(`DROP TABLE "outbound_pick_tasks"`);
    await queryRunner.query(`DROP TABLE "outbound_pick_releases"`);
  }
}
