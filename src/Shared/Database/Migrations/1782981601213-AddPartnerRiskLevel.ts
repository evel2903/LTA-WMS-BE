import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerRiskLevel1782981601213 implements MigrationInterface {
  name = 'AddPartnerRiskLevel1782981601213';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "risk_level" character varying(20)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN IF EXISTS "risk_level"`);
  }
}
