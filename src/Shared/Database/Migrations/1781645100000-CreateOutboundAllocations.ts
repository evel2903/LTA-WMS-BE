import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboundAllocations1781645100000 implements MigrationInterface {
  public name = 'CreateOutboundAllocations1781645100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "outbound_allocations" (
        "id" char(36) NOT NULL,
        "allocation_number" varchar(80) NOT NULL,
        "outbound_order_id" char(36) NOT NULL,
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "policy" varchar(40) NOT NULL,
        "status" varchar(40) NOT NULL,
        "total_ordered_quantity" numeric(18,4) NOT NULL,
        "total_allocated_quantity" numeric(18,4) NOT NULL,
        "total_backordered_quantity" numeric(18,4) NOT NULL,
        "shortage_reason" text,
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
        CONSTRAINT "PK_outbound_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_outbound_allocations_order" FOREIGN KEY ("outbound_order_id")
          REFERENCES "outbound_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_outbound_allocations_qty_non_negative" CHECK (
          "total_ordered_quantity" >= 0
          AND "total_allocated_quantity" >= 0
          AND "total_backordered_quantity" >= 0
        )
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "outbound_allocation_lines" (
        "id" char(36) NOT NULL,
        "allocation_id" char(36) NOT NULL,
        "outbound_order_line_id" char(36) NOT NULL,
        "line_number" integer NOT NULL,
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "ordered_quantity" numeric(18,4) NOT NULL,
        "allocated_quantity" numeric(18,4) NOT NULL,
        "backordered_quantity" numeric(18,4) NOT NULL,
        "source_balance_id" char(36),
        "source_dimension_id" char(36),
        "source_location_id" char(36),
        "inventory_status_code" varchar(50),
        "lot_number" varchar(100),
        "serial_number" varchar(100),
        "expiry_date" date,
        "status" varchar(40) NOT NULL,
        "shortage_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbound_allocation_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_outbound_allocation_lines_allocation" FOREIGN KEY ("allocation_id")
          REFERENCES "outbound_allocations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_outbound_allocation_lines_order_line" FOREIGN KEY ("outbound_order_line_id")
          REFERENCES "outbound_order_lines"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_allocation_lines_balance" FOREIGN KEY ("source_balance_id")
          REFERENCES "inventory_balances"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_outbound_allocation_lines_dimension" FOREIGN KEY ("source_dimension_id")
          REFERENCES "inventory_dimensions"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_outbound_allocation_lines_qty_non_negative" CHECK (
          "ordered_quantity" >= 0
          AND "allocated_quantity" >= 0
          AND "backordered_quantity" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_outbound_allocations_idempotency" ON "outbound_allocations" ("idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_allocations_order_status" ON "outbound_allocations" ("outbound_order_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_allocations_scope_status" ON "outbound_allocations" ("warehouse_id", "owner_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_allocation_lines_allocation" ON "outbound_allocation_lines" ("allocation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_allocation_lines_order_line" ON "outbound_allocation_lines" ("outbound_order_line_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_allocation_lines_source_balance" ON "outbound_allocation_lines" ("source_balance_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_allocation_lines_source_balance"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_allocation_lines_order_line"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_allocation_lines_allocation"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_allocations_scope_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbound_allocations_order_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_outbound_allocations_idempotency"`);
    await queryRunner.query(`DROP TABLE "outbound_allocation_lines"`);
    await queryRunner.query(`DROP TABLE "outbound_allocations"`);
  }
}
