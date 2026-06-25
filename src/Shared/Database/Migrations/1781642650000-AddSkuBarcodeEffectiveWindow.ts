import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuBarcodeEffectiveWindow1781642650000 implements MigrationInterface {
  public name = 'AddSkuBarcodeEffectiveWindow1781642650000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sku_barcodes" ADD COLUMN IF NOT EXISTS "effective_from" timestamptz`);
    await queryRunner.query(`ALTER TABLE "sku_barcodes" ADD COLUMN IF NOT EXISTS "effective_to" timestamptz`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CK_sku_barcodes_effective_window'
        ) THEN
          ALTER TABLE "sku_barcodes"
          ADD CONSTRAINT "CK_sku_barcodes_effective_window"
          CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" >= "effective_from");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sku_barcodes" DROP CONSTRAINT IF EXISTS "CK_sku_barcodes_effective_window"`);
    await queryRunner.query(`ALTER TABLE "sku_barcodes" DROP COLUMN IF EXISTS "effective_to"`);
    await queryRunner.query(`ALTER TABLE "sku_barcodes" DROP COLUMN IF EXISTS "effective_from"`);
  }
}
