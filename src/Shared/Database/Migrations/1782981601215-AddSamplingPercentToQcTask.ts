import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSamplingPercentToQcTask1782981601215 implements MigrationInterface {
  name = 'AddSamplingPercentToQcTask1782981601215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "qc_tasks" ADD COLUMN IF NOT EXISTS "sampling_percent" numeric(5,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "qc_tasks" DROP COLUMN IF EXISTS "sampling_percent"`);
  }
}
