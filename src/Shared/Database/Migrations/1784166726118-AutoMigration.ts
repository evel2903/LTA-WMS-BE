import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1784166726118 implements MigrationInterface {
  name = 'AutoMigration1784166726118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "permissions_version" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "permissions_version"`);
  }
}
