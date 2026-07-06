import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSerialLotNumberIndexToInventoryDimension1783328400532 implements MigrationInterface {
  name = 'AddSerialLotNumberIndexToInventoryDimension1783328400532';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_dimensions_lot_number" ON "inventory_dimensions" ("lot_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_dimensions_serial_number" ON "inventory_dimensions" ("serial_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_dimensions_serial_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_dimensions_lot_number"`);
  }
}
