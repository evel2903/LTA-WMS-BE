import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInboundLpnsAndPutawayReleases1781644200000 implements MigrationInterface {
  public name = 'CreateInboundLpnsAndPutawayReleases1781644200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_lpns" (
        "id" char(36) NOT NULL,
        "receipt_id" char(36) NOT NULL,
        "receipt_line_id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "inbound_plan_line_id" char(36) NOT NULL,
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "quantity" numeric(18,4) NOT NULL,
        "lpn_code" varchar(80) NOT NULL,
        "sscc_code" varchar(40),
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "idempotency_key" varchar(160) NOT NULL,
        "confirmed_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "confirmed_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inbound_lpns" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inbound_lpns_receipt" FOREIGN KEY ("receipt_id")
          REFERENCES "receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_lpns_receipt_line" FOREIGN KEY ("receipt_line_id")
          REFERENCES "receipt_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_lpns_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_lpns_plan_line" FOREIGN KEY ("inbound_plan_line_id")
          REFERENCES "inbound_plan_lines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inbound_lpns_receipt" ON "inbound_lpns" ("receipt_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inbound_lpns_line" ON "inbound_lpns" ("receipt_line_id")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_lpns_owner_warehouse" ON "inbound_lpns" ("owner_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inbound_lpns_scope_lpn" ON "inbound_lpns" ("warehouse_id", "owner_id", "lpn_code")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inbound_lpns_idempotency" ON "inbound_lpns" ("receipt_line_id", "idempotency_key")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_putaway_releases" (
        "id" char(36) NOT NULL,
        "inbound_lpn_id" char(36),
        "receipt_id" char(36) NOT NULL,
        "receipt_line_id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "inbound_plan_line_id" char(36) NOT NULL,
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "quantity" numeric(18,4) NOT NULL,
        "lpn_code" varchar(80),
        "sscc_code" varchar(40),
        "inventory_status_code" varchar(80) NOT NULL,
        "current_location_id" char(36),
        "current_location_code" varchar(80),
        "warehouse_profile_id" char(36),
        "label_decision" varchar(40),
        "label_reason" text,
        "matched_print_job_id" char(36),
        "constraint_json" jsonb,
        "outbox_message_id" char(36),
        "core_flow_milestone_id" char(36),
        "reason_code" varchar(80),
        "reason_code_id" char(36),
        "reason_note" text,
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "idempotency_key" varchar(160) NOT NULL,
        "released_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "released_by" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inbound_putaway_releases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inbound_putaway_releases_lpn" FOREIGN KEY ("inbound_lpn_id")
          REFERENCES "inbound_lpns"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_inbound_putaway_releases_receipt" FOREIGN KEY ("receipt_id")
          REFERENCES "receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_putaway_releases_receipt_line" FOREIGN KEY ("receipt_line_id")
          REFERENCES "receipt_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_putaway_releases_inbound_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inbound_putaway_releases_plan_line" FOREIGN KEY ("inbound_plan_line_id")
          REFERENCES "inbound_plan_lines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_putaway_releases_receipt" ON "inbound_putaway_releases" ("receipt_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_putaway_releases_line" ON "inbound_putaway_releases" ("receipt_line_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inbound_putaway_releases_owner_warehouse" ON "inbound_putaway_releases" ("owner_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inbound_putaway_releases_idempotency" ON "inbound_putaway_releases" ("receipt_line_id", "idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_inbound_putaway_releases_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_putaway_releases_owner_warehouse"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_putaway_releases_line"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_putaway_releases_receipt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_putaway_releases"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_inbound_lpns_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_inbound_lpns_scope_lpn"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_lpns_owner_warehouse"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_lpns_line"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_inbound_lpns_receipt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_lpns"`);
  }
}
