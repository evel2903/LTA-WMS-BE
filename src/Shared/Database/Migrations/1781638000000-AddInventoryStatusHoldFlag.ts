import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C14: add the `hold` control flag to inventory_statuses so a status can be marked
 * held/blocked and edited via the catalog screen (controlled update + audit). Column
 * only — existing seeded status names (doc 04 §11.01 superset) are untouched. After C9
 * (1781637000000).
 */
export class AddInventoryStatusHoldFlag1781638000000 implements MigrationInterface {
  name = 'AddInventoryStatusHoldFlag1781638000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_statuses" ADD COLUMN "hold" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_statuses" DROP COLUMN "hold"`);
  }
}
