import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestedLotSerialToOutboundOrderLines1782981601217 implements MigrationInterface {
  name = 'AddRequestedLotSerialToOutboundOrderLines1782981601217';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "outbound_order_lines" ADD COLUMN IF NOT EXISTS "requested_lot_number" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_order_lines" ADD COLUMN IF NOT EXISTS "requested_serial_number" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "outbound_order_lines" DROP COLUMN IF EXISTS "requested_serial_number"`);
    await queryRunner.query(`ALTER TABLE "outbound_order_lines" DROP COLUMN IF EXISTS "requested_lot_number"`);
  }
}
