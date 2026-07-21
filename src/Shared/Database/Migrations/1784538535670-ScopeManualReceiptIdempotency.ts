import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScopeManualReceiptIdempotency1784538535670 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receipts_manual_idempotency"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receipts_manual_idempotency"
      ON "receipts" ("owner_id", "warehouse_id", "idempotency_key")
      WHERE "inbound_plan_id" IS NULL AND "idempotency_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_receipts_manual_idempotency"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_receipts_manual_idempotency"
      ON "receipts" ("owner_id", "warehouse_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `);
  }
}
