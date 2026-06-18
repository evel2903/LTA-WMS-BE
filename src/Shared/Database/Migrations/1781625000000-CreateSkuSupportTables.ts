import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSkuSupportTables1781625000000 implements MigrationInterface {
  name = 'CreateSkuSupportTables1781625000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pack_definitions" ("id" character(36) NOT NULL, "sku_id" character(36) NOT NULL, "pack_code" character varying(50) NOT NULL, "pack_name" character varying(255) NOT NULL, "uom_id" character(36) NOT NULL, "quantity_per_pack" numeric(18,6) NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_pack_definitions_sku_pack_code" UNIQUE ("sku_id", "pack_code"), CONSTRAINT "PK_pack_definitions_id" PRIMARY KEY ("id"), CONSTRAINT "FK_pack_definitions_sku_id_skus_id" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_pack_definitions_uom_id_uoms_id" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pack_definitions_active_default_sku" ON "pack_definitions" ("sku_id") WHERE is_default = true AND status = 'Active'`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_pack_definitions_sku_id" ON "pack_definitions" ("sku_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_pack_definitions_uom_id" ON "pack_definitions" ("uom_id")`);

    await queryRunner.query(
      `CREATE TABLE "uom_conversions" ("id" character(36) NOT NULL, "sku_id" character(36) NOT NULL, "from_uom_id" character(36) NOT NULL, "to_uom_id" character(36) NOT NULL, "factor" numeric(18,6) NOT NULL, "effective_from" TIMESTAMP WITH TIME ZONE NOT NULL, "effective_to" TIMESTAMP WITH TIME ZONE, "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_uom_conversions_sku_from_to_effective" UNIQUE ("sku_id", "from_uom_id", "to_uom_id", "effective_from"), CONSTRAINT "PK_uom_conversions_id" PRIMARY KEY ("id"), CONSTRAINT "FK_uom_conversions_sku_id_skus_id" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_uom_conversions_from_uom_id_uoms_id" FOREIGN KEY ("from_uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_uom_conversions_to_uom_id_uoms_id" FOREIGN KEY ("to_uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_uom_conversions_sku_id" ON "uom_conversions" ("sku_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_uom_conversions_from_uom_id" ON "uom_conversions" ("from_uom_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_uom_conversions_to_uom_id" ON "uom_conversions" ("to_uom_id")`);

    await queryRunner.query(
      `CREATE TABLE "sku_barcodes" ("id" character(36) NOT NULL, "sku_id" character(36) NOT NULL, "owner_id" character(36), "uom_id" character(36) NOT NULL, "pack_code" character varying(50), "barcode_value" character varying(120) NOT NULL, "barcode_type" character varying(30) NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "PK_sku_barcodes_id" PRIMARY KEY ("id"), CONSTRAINT "FK_sku_barcodes_sku_id_skus_id" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_sku_barcodes_owner_id_owners_id" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_sku_barcodes_uom_id_uoms_id" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sku_barcodes_global_barcode_value" ON "sku_barcodes" ("barcode_value") WHERE owner_id IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sku_barcodes_owner_barcode_value" ON "sku_barcodes" ("owner_id", "barcode_value") WHERE owner_id IS NOT NULL`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_sku_barcodes_sku_id" ON "sku_barcodes" ("sku_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sku_barcodes_owner_id" ON "sku_barcodes" ("owner_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sku_barcodes_uom_id" ON "sku_barcodes" ("uom_id")`);

    await queryRunner.query(
      `CREATE TABLE "item_coverages" ("id" character(36) NOT NULL, "sku_id" character(36) NOT NULL, "warehouse_id" character(36) NOT NULL, "owner_id" character(36), "min_qty" numeric(18,6), "max_qty" numeric(18,6), "standard_qty" numeric(18,6), "multiple_qty" numeric(18,6), "lead_time_days" integer, "default_receive_warehouse_id" character(36), "default_ship_warehouse_id" character(36), "reorder_policy" jsonb, "stop_receiving" boolean NOT NULL DEFAULT false, "stop_shipping" boolean NOT NULL DEFAULT false, "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "PK_item_coverages_id" PRIMARY KEY ("id"), CONSTRAINT "FK_item_coverages_sku_id_skus_id" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_item_coverages_warehouse_id_warehouses_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_item_coverages_owner_id_owners_id" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_item_coverages_default_receive_warehouse_id_warehouses_id" FOREIGN KEY ("default_receive_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_item_coverages_default_ship_warehouse_id_warehouses_id" FOREIGN KEY ("default_ship_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_item_coverages_sku_warehouse_global_owner" ON "item_coverages" ("sku_id", "warehouse_id") WHERE owner_id IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_item_coverages_sku_warehouse_owner" ON "item_coverages" ("sku_id", "warehouse_id", "owner_id") WHERE owner_id IS NOT NULL`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_item_coverages_sku_id" ON "item_coverages" ("sku_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_item_coverages_warehouse_id" ON "item_coverages" ("warehouse_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_item_coverages_owner_id" ON "item_coverages" ("owner_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_item_coverages_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_coverages_warehouse_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_coverages_sku_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_item_coverages_sku_warehouse_owner"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_item_coverages_sku_warehouse_global_owner"`);
    await queryRunner.query(`DROP TABLE "item_coverages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sku_barcodes_uom_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sku_barcodes_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sku_barcodes_sku_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_sku_barcodes_owner_barcode_value"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_sku_barcodes_global_barcode_value"`);
    await queryRunner.query(`DROP TABLE "sku_barcodes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_uom_conversions_to_uom_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_uom_conversions_from_uom_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_uom_conversions_sku_id"`);
    await queryRunner.query(`DROP TABLE "uom_conversions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pack_definitions_uom_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pack_definitions_sku_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_pack_definitions_active_default_sku"`);
    await queryRunner.query(`DROP TABLE "pack_definitions"`);
  }
}
