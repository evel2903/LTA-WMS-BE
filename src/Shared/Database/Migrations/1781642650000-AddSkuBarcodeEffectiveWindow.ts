import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuBarcodeEffectiveWindow1781642650000 implements MigrationInterface {
  public name = 'AddSkuBarcodeEffectiveWindow1781642650000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sku_barcodes" ADD "effective_from" timestamptz`);
    await queryRunner.query(`ALTER TABLE "sku_barcodes" ADD "effective_to" timestamptz`);
    await queryRunner.query(`
      ALTER TABLE "sku_barcodes"
      ADD CONSTRAINT "CK_sku_barcodes_effective_window"
      CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" >= "effective_from")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sku_barcodes" DROP CONSTRAINT "CK_sku_barcodes_effective_window"`);
    await queryRunner.query(`ALTER TABLE "sku_barcodes" DROP COLUMN "effective_to"`);
    await queryRunner.query(`ALTER TABLE "sku_barcodes" DROP COLUMN "effective_from"`);
  }
}
