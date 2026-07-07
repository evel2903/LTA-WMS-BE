import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSerialLotNumberIndexToInventoryDimension1783328400532 implements MigrationInterface {
  name = 'AddSerialLotNumberIndexToInventoryDimension1783328400532';

  // ponytail: plain CREATE INDEX (not CONCURRENTLY) takes an ACCESS EXCLUSIVE
  // lock for the build duration. Acceptable at today's row counts; if
  // inventory_dimensions grows large enough for this to matter, switch to
  // CONCURRENTLY + set migrationsTransactionMode: 'each' on the DataSource
  // (CONCURRENTLY cannot run inside the 'all' mode's shared migration transaction).
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
