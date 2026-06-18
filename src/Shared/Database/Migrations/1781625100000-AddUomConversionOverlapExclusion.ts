import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUomConversionOverlapExclusion1781625100000 implements MigrationInterface {
  name = 'AddUomConversionOverlapExclusion1781625100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(
      `ALTER TABLE "uom_conversions" ADD CONSTRAINT "EX_uom_conversions_active_window_overlap" EXCLUDE USING gist ("sku_id" WITH =, "from_uom_id" WITH =, "to_uom_id" WITH =, tstzrange("effective_from", COALESCE("effective_to", 'infinity'::timestamptz), '[]') WITH &&) WHERE (status = 'Active')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "uom_conversions" DROP CONSTRAINT IF EXISTS "EX_uom_conversions_active_window_overlap"`,
    );
  }
}
