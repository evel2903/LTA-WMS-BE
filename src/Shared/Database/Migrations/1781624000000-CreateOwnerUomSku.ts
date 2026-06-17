import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOwnerUomSku1781624000000 implements MigrationInterface {
  name = 'CreateOwnerUomSku1781624000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "owners" ("id" character(36) NOT NULL, "owner_code" character varying(50) NOT NULL, "owner_name" character varying(255) NOT NULL, "status" character varying(30) NOT NULL, "billing_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "visibility_scope" jsonb NOT NULL DEFAULT '{}'::jsonb, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_owners_owner_code" UNIQUE ("owner_code"), CONSTRAINT "PK_owners_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "uoms" ("id" character(36) NOT NULL, "uom_code" character varying(50) NOT NULL, "uom_name" character varying(255) NOT NULL, "uom_type" character varying(50) NOT NULL DEFAULT 'Quantity', "decimal_precision" integer NOT NULL DEFAULT 0, "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_uoms_uom_code" UNIQUE ("uom_code"), CONSTRAINT "PK_uoms_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "skus" ("id" character(36) NOT NULL, "sku_code" character varying(80) NOT NULL, "sku_name" character varying(255) NOT NULL, "default_owner_id" character(36), "item_class" character varying(50) NOT NULL, "item_status" character varying(30) NOT NULL, "base_uom_id" character(36) NOT NULL, "inventory_uom_id" character(36) NOT NULL, "lot_controlled" boolean NOT NULL DEFAULT false, "expiry_controlled" boolean NOT NULL DEFAULT false, "serial_controlled" boolean NOT NULL DEFAULT false, "owner_controlled" boolean NOT NULL DEFAULT false, "lpn_controlled" boolean NOT NULL DEFAULT false, "temperature_controlled" boolean NOT NULL DEFAULT false, "dg_controlled" boolean NOT NULL DEFAULT false, "customs_controlled" boolean NOT NULL DEFAULT false, "qc_required" boolean NOT NULL DEFAULT false, "temperature_class" character varying(50), "dg_class" character varying(50), "bonded_flag" boolean NOT NULL DEFAULT false, "shelf_life_days" integer, "min_remaining_shelf_life_days" integer, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_skus_sku_code" UNIQUE ("sku_code"), CONSTRAINT "PK_skus_id" PRIMARY KEY ("id"), CONSTRAINT "FK_skus_default_owner_id_owners_id" FOREIGN KEY ("default_owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_skus_base_uom_id_uoms_id" FOREIGN KEY ("base_uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_skus_inventory_uom_id_uoms_id" FOREIGN KEY ("inventory_uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_skus_default_owner_id" ON "skus" ("default_owner_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_skus_base_uom_id" ON "skus" ("base_uom_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_skus_inventory_uom_id" ON "skus" ("inventory_uom_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_skus_inventory_uom_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_skus_base_uom_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_skus_default_owner_id"`);
    await queryRunner.query(`DROP TABLE "skus"`);
    await queryRunner.query(`DROP TABLE "uoms"`);
    await queryRunner.query(`DROP TABLE "owners"`);
  }
}
