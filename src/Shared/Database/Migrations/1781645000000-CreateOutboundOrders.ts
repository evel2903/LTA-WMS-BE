import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboundOrders1781645000000 implements MigrationInterface {
  public name = 'CreateOutboundOrders1781645000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbound_orders" (
        "id" char(36) NOT NULL,
        "order_number" varchar(80) NOT NULL,
        "source_system" varchar(100) NOT NULL,
        "source_reference" varchar(120) NOT NULL,
        "business_reference" varchar(180) NOT NULL,
        "customer_id" char(36),
        "customer_source_system" varchar(100),
        "customer_external_reference" varchar(120),
        "customer_code" varchar(80),
        "ship_to_reference" varchar(160),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "priority" integer,
        "cutoff_at" timestamptz,
        "document_status" varchar(40) NOT NULL,
        "validation_errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "core_flow_instance_id" char(36),
        "outbox_message_id" char(36),
        "import_idempotency_key" varchar(180) NOT NULL,
        "import_payload_fingerprint" varchar(64) NOT NULL,
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "action_idempotency" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_outbound_orders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbound_order_lines" (
        "id" char(36) NOT NULL,
        "outbound_order_id" char(36) NOT NULL,
        "line_number" integer NOT NULL,
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "ordered_quantity" numeric(18,4) NOT NULL,
        "external_line_reference" varchar(120),
        "validation_errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbound_order_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_outbound_order_lines_order" FOREIGN KEY ("outbound_order_id")
          REFERENCES "outbound_orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_outbound_orders_business_key" ON "outbound_orders" ("source_system", "source_reference", "owner_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_outbound_orders_import_idempotency" ON "outbound_orders" ("import_idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_outbound_orders_scope_status" ON "outbound_orders" ("warehouse_id", "owner_id", "document_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_outbound_orders_customer" ON "outbound_orders" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_outbound_order_lines_order" ON "outbound_order_lines" ("outbound_order_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_outbound_order_lines_order_line" ON "outbound_order_lines" ("outbound_order_id", "line_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_outbound_order_lines_order_line"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_outbound_order_lines_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_outbound_orders_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_outbound_orders_scope_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_outbound_orders_import_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_outbound_orders_business_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outbound_order_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outbound_orders"`);
  }
}
