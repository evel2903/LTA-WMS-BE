import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowManualInboundReceipts1784400000000 implements MigrationInterface {
  public name = 'AllowManualInboundReceipts1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "receipts"
        ADD COLUMN IF NOT EXISTS "warehouse_profile_id" char(36),
        ADD COLUMN IF NOT EXISTS "supplier_id" char(36),
        ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(160)
    `);
    await queryRunner.query(`
      UPDATE "receipts" r
      SET
        "supplier_id" = COALESCE(r."supplier_id", p."supplier_id"),
        "warehouse_profile_id" = COALESCE(r."warehouse_profile_id", p."warehouse_profile_id")
      FROM "inbound_plans" p
      WHERE r."inbound_plan_id" = p."id"
        AND (r."supplier_id" IS NULL OR r."warehouse_profile_id" IS NULL)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "receipts" WHERE "supplier_id" IS NULL) THEN
          RAISE EXCEPTION 'Cannot require receipts.supplier_id because backfill left NULL rows';
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE "receipts" ALTER COLUMN "supplier_id" SET NOT NULL`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_receipts_supplier') THEN
          ALTER TABLE "receipts"
            ADD CONSTRAINT "FK_receipts_supplier"
            FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_receipts_warehouse_profile') THEN
          ALTER TABLE "receipts"
            ADD CONSTRAINT "FK_receipts_warehouse_profile"
            FOREIGN KEY ("warehouse_profile_id") REFERENCES "warehouse_profiles"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    for (const table of [
      'receipts',
      'receiving_sessions',
      'receipt_lines',
      'inbound_discrepancies',
      'qc_tasks',
      'qc_results',
      'inbound_lpns',
      'inbound_putaway_releases',
      'putaway_tasks',
    ]) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "inbound_plan_id" DROP NOT NULL`);
    }
    for (const table of [
      'receipt_lines',
      'inbound_discrepancies',
      'qc_tasks',
      'qc_results',
      'inbound_lpns',
      'inbound_putaway_releases',
      'putaway_tasks',
    ]) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "inbound_plan_line_id" DROP NOT NULL`);
    }
    await queryRunner.query(`ALTER TABLE "receipt_lines" ALTER COLUMN "expected_quantity" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inbound_discrepancies" ALTER COLUMN "expected_quantity" DROP NOT NULL`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receipts_manual_idempotency"
      ON "receipts" ("owner_id", "warehouse_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receipts_manual_number"
      ON "receipts" ("owner_id", "warehouse_id", "receipt_number")
      WHERE "inbound_plan_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receiving_sessions_receipt_key"
      ON "receiving_sessions" ("receipt_id", "session_key")
    `);
    // This unconditional index is superseded by ScopeManualPutawayReleaseUniqueness
    // (timestamped to run BEFORE this migration), which recreates the same index name
    // scoped WHERE inbound_plan_id IS NULL. On a fresh DB this statement is a no-op
    // (IF NOT EXISTS sees the name already taken); on an already-migrated DB it never
    // runs again. Left here only so this migration's up()/down() pair stays self-describing.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inbound_putaway_releases_receipt_line"
      ON "inbound_putaway_releases" ("receipt_line_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "receipts" WHERE "inbound_plan_id" IS NULL)
          OR EXISTS (SELECT 1 FROM "receiving_sessions" WHERE "inbound_plan_id" IS NULL)
          OR EXISTS (SELECT 1 FROM "receipt_lines" WHERE "inbound_plan_id" IS NULL OR "inbound_plan_line_id" IS NULL OR "expected_quantity" IS NULL)
          OR EXISTS (SELECT 1 FROM "inbound_discrepancies" WHERE "inbound_plan_id" IS NULL OR "inbound_plan_line_id" IS NULL OR "expected_quantity" IS NULL)
          OR EXISTS (SELECT 1 FROM "qc_tasks" WHERE "inbound_plan_id" IS NULL OR "inbound_plan_line_id" IS NULL)
          OR EXISTS (SELECT 1 FROM "qc_results" WHERE "inbound_plan_id" IS NULL OR "inbound_plan_line_id" IS NULL)
          OR EXISTS (SELECT 1 FROM "inbound_lpns" WHERE "inbound_plan_id" IS NULL OR "inbound_plan_line_id" IS NULL)
          OR EXISTS (SELECT 1 FROM "inbound_putaway_releases" WHERE "inbound_plan_id" IS NULL OR "inbound_plan_line_id" IS NULL)
          OR EXISTS (SELECT 1 FROM "putaway_tasks" WHERE "inbound_plan_id" IS NULL OR "inbound_plan_line_id" IS NULL)
        THEN
          RAISE EXCEPTION 'Cannot roll back IPR-02 while manual inbound lineage exists';
        END IF;
      END $$;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_inbound_putaway_releases_receipt_line"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receiving_sessions_receipt_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receipts_manual_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receipts_manual_idempotency"`);

    await queryRunner.query(`ALTER TABLE "receipt_lines" ALTER COLUMN "expected_quantity" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inbound_discrepancies" ALTER COLUMN "expected_quantity" SET NOT NULL`);
    for (const table of [
      'receipt_lines',
      'inbound_discrepancies',
      'qc_tasks',
      'qc_results',
      'inbound_lpns',
      'inbound_putaway_releases',
      'putaway_tasks',
    ]) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "inbound_plan_line_id" SET NOT NULL`);
    }
    for (const table of [
      'receipts',
      'receiving_sessions',
      'receipt_lines',
      'inbound_discrepancies',
      'qc_tasks',
      'qc_results',
      'inbound_lpns',
      'inbound_putaway_releases',
      'putaway_tasks',
    ]) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "inbound_plan_id" SET NOT NULL`);
    }

    await queryRunner.query(`ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "FK_receipts_warehouse_profile"`);
    await queryRunner.query(`ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "FK_receipts_supplier"`);
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN IF EXISTS "idempotency_key"`);
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN IF EXISTS "supplier_id"`);
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN IF EXISTS "warehouse_profile_id"`);
  }
}
