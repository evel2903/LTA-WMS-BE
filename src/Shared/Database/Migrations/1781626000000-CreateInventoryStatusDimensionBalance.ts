import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryStatusDimensionBalance1781626000000 implements MigrationInterface {
  name = 'CreateInventoryStatusDimensionBalance1781626000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "inventory_statuses" ("id" character(36) NOT NULL, "status_code" character varying(50) NOT NULL, "display_name" character varying(255) NOT NULL, "stage_group" character varying(100) NOT NULL, "allows_allocation" boolean NOT NULL DEFAULT false, "allows_pick" boolean NOT NULL DEFAULT false, "is_terminal" boolean NOT NULL DEFAULT false, "is_milestone" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL, "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_inventory_statuses_status_code" UNIQUE ("status_code"), CONSTRAINT "PK_inventory_statuses_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `INSERT INTO "inventory_statuses" ("id", "status_code", "display_name", "stage_group", "allows_allocation", "allows_pick", "is_terminal", "is_milestone", "sort_order", "status", "created_at", "updated_at") VALUES
      ('00000000-0000-0000-0000-000000000101', 'PENDING_RECEIPT', 'Pending Receipt', 'Inbound', false, false, false, false, 10, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000102', 'PENDING_QC', 'Pending QC', 'Inbound', false, false, false, false, 20, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000103', 'READY_FOR_PUTAWAY', 'Ready for Putaway', 'Inbound', false, false, false, false, 30, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000104', 'READY_FOR_CROSS_DOCK', 'Ready for Cross Dock', 'Inbound', false, false, false, false, 40, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000105', 'READY_FOR_RECEIVING', 'Ready for Receiving', 'Inbound', false, false, false, true, 50, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000201', 'AVAILABLE', 'Available', 'StorageControl', true, true, false, false, 100, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000202', 'HOLD', 'Hold', 'StorageControl', false, false, false, false, 110, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000203', 'QUARANTINE', 'Quarantine', 'StorageControl', false, false, false, false, 120, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000204', 'DAMAGED', 'Damaged', 'StorageControl', false, false, false, false, 130, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000205', 'REJECTED', 'Rejected', 'StorageControl', false, false, false, false, 140, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000206', 'COUNTING_LOCKED', 'Counting Locked', 'StorageControl', false, false, false, false, 150, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000207', 'IN_TRANSIT', 'In Transit', 'StorageControl', false, false, false, false, 160, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000301', 'ALLOCATED', 'Allocated', 'Outbound', false, true, false, false, 200, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000302', 'RELEASED', 'Released', 'Outbound', false, true, false, false, 210, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000303', 'PICK_IN_PROGRESS', 'Pick in Progress', 'Outbound', false, false, false, false, 220, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000304', 'PICKED', 'Picked', 'Outbound', false, false, false, false, 230, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000305', 'CHECK_EXCEPTION', 'Check Exception', 'Outbound', false, false, false, false, 240, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000306', 'PACKED', 'Packed', 'Outbound', false, false, false, false, 250, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000307', 'READY_FOR_STAGING', 'Ready for Staging', 'Outbound', false, false, false, false, 260, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000401', 'STAGED', 'Staged', 'ShippingPackageLoad', false, false, false, false, 300, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000402', 'LOADING_IN_PROGRESS', 'Loading in Progress', 'ShippingPackageLoad', false, false, false, false, 310, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000403', 'LOADED', 'Loaded', 'ShippingPackageLoad', false, false, false, false, 320, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000501', 'RETURNED', 'Returned', 'Returns', false, false, false, false, 400, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000502', 'INSPECTED', 'Inspected', 'Returns', false, false, false, false, 410, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000503', 'HOLD_RETURN', 'Hold Return', 'Returns', false, false, false, false, 420, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000504', 'REWORK_PENDING', 'Rework Pending', 'Returns', false, false, false, false, 430, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000505', 'SCRAPPED_DISPOSED', 'Scrapped/Disposed', 'Returns', false, false, true, false, 440, 'Active', now(), now()),
      ('00000000-0000-0000-0000-000000000506', 'RETURNED_TO_VENDOR', 'Returned to Vendor', 'Returns', false, false, true, false, 450, 'Active', now(), now())`,
    );

    await queryRunner.query(
      `CREATE TABLE "inventory_dimensions" ("id" character(36) NOT NULL, "owner_id" character(36) NOT NULL, "sku_id" character(36) NOT NULL, "warehouse_id" character(36) NOT NULL, "location_id" character(36) NOT NULL, "inventory_status_id" character(36) NOT NULL, "dimension_key_hash" character(64) NOT NULL, "uom_id" character(36), "lpn_code" character varying(100), "lot_number" character varying(100), "expiry_date" date, "serial_number" character varying(100), "production_date" date, "country_of_origin" character varying(50), "customs_status" character varying(50), "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_inventory_dimensions_dimension_key_hash" UNIQUE ("dimension_key_hash"), CONSTRAINT "PK_inventory_dimensions_id" PRIMARY KEY ("id"), CONSTRAINT "FK_inventory_dimensions_owner_id_owners_id" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_inventory_dimensions_sku_id_skus_id" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_inventory_dimensions_warehouse_id_warehouses_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_inventory_dimensions_location_id_locations_id" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_inventory_dimensions_inventory_status_id_inventory_statuses_id" FOREIGN KEY ("inventory_status_id") REFERENCES "inventory_statuses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_inventory_dimensions_uom_id_uoms_id" FOREIGN KEY ("uom_id") REFERENCES "uoms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_inventory_dimensions_owner_id" ON "inventory_dimensions" ("owner_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_dimensions_sku_id" ON "inventory_dimensions" ("sku_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_dimensions_warehouse_id" ON "inventory_dimensions" ("warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_dimensions_location_id" ON "inventory_dimensions" ("location_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_dimensions_inventory_status_id" ON "inventory_dimensions" ("inventory_status_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_inventory_dimensions_uom_id" ON "inventory_dimensions" ("uom_id")`);

    await queryRunner.query(
      `CREATE TABLE "inventory_balances" ("id" character(36) NOT NULL, "dimension_id" character(36) NOT NULL, "qty_on_hand" numeric(18,6) NOT NULL DEFAULT 0, "qty_reserved" numeric(18,6) NOT NULL DEFAULT 0, "qty_available" numeric(18,6) NOT NULL DEFAULT 0, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_inventory_balances_dimension_id" UNIQUE ("dimension_id"), CONSTRAINT "CHK_inventory_balances_qty_on_hand_non_negative" CHECK ("qty_on_hand" >= 0), CONSTRAINT "CHK_inventory_balances_qty_reserved_non_negative" CHECK ("qty_reserved" >= 0), CONSTRAINT "CHK_inventory_balances_qty_available_non_negative" CHECK ("qty_available" >= 0), CONSTRAINT "CHK_inventory_balances_reserved_lte_on_hand" CHECK ("qty_reserved" <= "qty_on_hand"), CONSTRAINT "CHK_inventory_balances_qty_available_calculated" CHECK ("qty_available" = "qty_on_hand" - "qty_reserved"), CONSTRAINT "PK_inventory_balances_id" PRIMARY KEY ("id"), CONSTRAINT "FK_inventory_balances_dimension_id_inventory_dimensions_id" FOREIGN KEY ("dimension_id") REFERENCES "inventory_dimensions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_balances_dimension_id" ON "inventory_balances" ("dimension_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_balances_dimension_id"`);
    await queryRunner.query(`DROP TABLE "inventory_balances"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_dimensions_uom_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_dimensions_inventory_status_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_dimensions_location_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_dimensions_warehouse_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_dimensions_sku_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inventory_dimensions_owner_id"`);
    await queryRunner.query(`DROP TABLE "inventory_dimensions"`);
    await queryRunner.query(`DROP TABLE "inventory_statuses"`);
  }
}
