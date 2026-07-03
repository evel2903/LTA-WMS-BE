import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRuleCodeToInboundDiscrepancyAndPutawayRelease1782981601214 implements MigrationInterface {
  name = 'AddRuleCodeToInboundDiscrepancyAndPutawayRelease1782981601214';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inbound_discrepancies" ADD COLUMN IF NOT EXISTS "rule_code" character varying(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inbound_putaway_releases" ADD COLUMN IF NOT EXISTS "rule_code" character varying(80)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inbound_putaway_releases" DROP COLUMN IF EXISTS "rule_code"`);
    await queryRunner.query(`ALTER TABLE "inbound_discrepancies" DROP COLUMN IF EXISTS "rule_code"`);
  }
}
