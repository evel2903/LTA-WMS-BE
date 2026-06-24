import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingGoodsIssuePosting1781717700000 implements MigrationInterface {
  name = 'AddShippingGoodsIssuePosting1781717700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipping_package_staging"
        ADD COLUMN IF NOT EXISTS "goods_issue_idempotency_key" varchar(180),
        ADD COLUMN IF NOT EXISTS "goods_issue_payload_fingerprint" varchar(64),
        ADD COLUMN IF NOT EXISTS "goods_issue_status" varchar(40),
        ADD COLUMN IF NOT EXISTS "goods_issue_posted_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "goods_issue_posted_by" char(36),
        ADD COLUMN IF NOT EXISTS "goods_issue_inventory_transaction_id" char(36),
        ADD COLUMN IF NOT EXISTS "goods_issue_inventory_movement_id" char(36),
        ADD COLUMN IF NOT EXISTS "goods_issue_outbox_message_id" char(36),
        ADD COLUMN IF NOT EXISTS "shipment_closed_outbox_message_id" char(36),
        ADD COLUMN IF NOT EXISTS "shipment_closed_at" timestamptz
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_shipping_package_staging_goods_issue_idempotency"
        ON "shipping_package_staging" ("goods_issue_idempotency_key")
        WHERE "goods_issue_idempotency_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_shipping_package_staging_goods_issue_idempotency"');
    await queryRunner.query(`
      ALTER TABLE "shipping_package_staging"
        DROP COLUMN IF EXISTS "shipment_closed_at",
        DROP COLUMN IF EXISTS "shipment_closed_outbox_message_id",
        DROP COLUMN IF EXISTS "goods_issue_outbox_message_id",
        DROP COLUMN IF EXISTS "goods_issue_inventory_movement_id",
        DROP COLUMN IF EXISTS "goods_issue_inventory_transaction_id",
        DROP COLUMN IF EXISTS "goods_issue_posted_by",
        DROP COLUMN IF EXISTS "goods_issue_posted_at",
        DROP COLUMN IF EXISTS "goods_issue_status",
        DROP COLUMN IF EXISTS "goods_issue_payload_fingerprint",
        DROP COLUMN IF EXISTS "goods_issue_idempotency_key"
    `);
  }
}
