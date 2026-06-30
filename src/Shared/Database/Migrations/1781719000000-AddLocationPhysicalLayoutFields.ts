import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationPhysicalLayoutFields1781719000000 implements MigrationInterface {
  name = 'AddLocationPhysicalLayoutFields1781719000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "aisle_code" character varying(50)`);
    await queryRunner.query(`ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "rack_code" character varying(50)`);
    await queryRunner.query(`ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "level_code" character varying(50)`);
    await queryRunner.query(`ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "bin_code" character varying(50)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_locations_physical_address_full" ON "locations" ("warehouse_id", "zone_id", "aisle_code", "rack_code", "level_code", "bin_code") WHERE "aisle_code" IS NOT NULL AND "rack_code" IS NOT NULL AND "level_code" IS NOT NULL AND "bin_code" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_locations_physical_address_full"`);
    await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN IF EXISTS "bin_code"`);
    await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN IF EXISTS "level_code"`);
    await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN IF EXISTS "rack_code"`);
    await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN IF EXISTS "aisle_code"`);
  }
}
