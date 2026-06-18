import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryBalanceAvailableQuantityCheck1781626100000 implements MigrationInterface {
  name = 'AddInventoryBalanceAvailableQuantityCheck1781626100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CHK_inventory_balances_qty_available_calculated'
        ) THEN
          ALTER TABLE "inventory_balances"
          ADD CONSTRAINT "CHK_inventory_balances_qty_available_calculated"
          CHECK ("qty_available" = "qty_on_hand" - "qty_reserved");
        END IF;
      END $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_balances" DROP CONSTRAINT IF EXISTS "CHK_inventory_balances_qty_available_calculated"`,
    );
  }
}
