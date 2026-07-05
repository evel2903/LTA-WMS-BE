import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLotExpirySerialToReceivingChain1782981601216 implements MigrationInterface {
  name = 'AddLotExpirySerialToReceivingChain1782981601216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['receipt_lines', 'inbound_putaway_releases', 'putaway_tasks']) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "lot_number" character varying(100)`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "expiry_date" date`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "serial_number" character varying(100)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['putaway_tasks', 'inbound_putaway_releases', 'receipt_lines']) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "serial_number"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "expiry_date"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "lot_number"`);
    }
  }
}
