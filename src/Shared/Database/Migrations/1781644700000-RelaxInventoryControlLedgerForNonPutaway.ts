import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelaxInventoryControlLedgerForNonPutaway1781644700000 implements MigrationInterface {
  name = 'RelaxInventoryControlLedgerForNonPutaway1781644700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_transactions" ALTER COLUMN "putaway_task_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_transactions" ALTER COLUMN "putaway_task_code" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_transactions" ALTER COLUMN "uom_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "putaway_task_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "putaway_task_code" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "uom_id" DROP NOT NULL`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_inventory_transactions_operation_idempotency_no_task"
      ON "inventory_transactions" ("transaction_type", "idempotency_key")
      WHERE "putaway_task_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_inventory_transactions_operation_idempotency_no_task"`);
    await queryRunner.query(`DELETE FROM "inventory_movements" WHERE "putaway_task_id" IS NULL`);
    await queryRunner.query(`DELETE FROM "inventory_transactions" WHERE "putaway_task_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "uom_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "putaway_task_code" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" ALTER COLUMN "putaway_task_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_transactions" ALTER COLUMN "uom_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_transactions" ALTER COLUMN "putaway_task_code" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "inventory_transactions" ALTER COLUMN "putaway_task_id" SET NOT NULL`);
  }
}
