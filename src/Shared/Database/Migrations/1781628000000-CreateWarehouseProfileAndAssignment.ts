import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseProfileAndAssignment1781628000000 implements MigrationInterface {
  name = 'CreateWarehouseProfileAndAssignment1781628000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "warehouse_profiles" ("id" character(36) NOT NULL, "profile_code" character varying(80) NOT NULL, "profile_name" character varying(255) NOT NULL, "warehouse_type_code" character varying(50) NOT NULL, "version" integer NOT NULL DEFAULT 1, "status" character varying(30) NOT NULL, "warehouse_id" character(36), "zone_id" character(36), "location_type" character varying(50), "owner_id" character(36), "sku_id" character(36), "item_class" character varying(50), "order_type" character varying(50), "customer_id" character(36), "supplier_id" character(36), "scope_key" character varying(128) NOT NULL, "effective_from" TIMESTAMP WITH TIME ZONE NOT NULL, "effective_to" TIMESTAMP WITH TIME ZONE, "capability_flags" jsonb NOT NULL DEFAULT '{}'::jsonb, "strategy_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "threshold_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "approval_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "label_device_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "integration_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "audit_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_warehouse_profiles_profile_code" UNIQUE ("profile_code"), CONSTRAINT "PK_warehouse_profiles_id" PRIMARY KEY ("id"), CONSTRAINT "FK_warehouse_profiles_warehouse_id_warehouses_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_warehouse_profiles_zone_id_zones_id" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_warehouse_profiles_owner_id_owners_id" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_warehouse_profiles_sku_id_skus_id" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_warehouse_profiles_scope_key" ON "warehouse_profiles" ("scope_key")`);

    await queryRunner.query(
      `CREATE TABLE "warehouse_profile_assignments" ("id" character(36) NOT NULL, "warehouse_profile_id" character(36) NOT NULL, "assignment_type" character varying(30) NOT NULL, "warehouse_type_code" character varying(50), "warehouse_id" character(36), "scope_key" character varying(128) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "PK_warehouse_profile_assignments_id" PRIMARY KEY ("id"), CONSTRAINT "FK_warehouse_profile_assignments_warehouse_profile_id_warehouse_profiles_id" FOREIGN KEY ("warehouse_profile_id") REFERENCES "warehouse_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_warehouse_profile_assignments_warehouse_id_warehouses_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_profile_assignments_warehouse_profile_id" ON "warehouse_profile_assignments" ("warehouse_profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_profile_assignments_scope_key" ON "warehouse_profile_assignments" ("scope_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_warehouse_profile_assignments_scope_key"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warehouse_profile_assignments_warehouse_profile_id"`);
    await queryRunner.query(`DROP TABLE "warehouse_profile_assignments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warehouse_profiles_scope_key"`);
    await queryRunner.query(`DROP TABLE "warehouse_profiles"`);
  }
}
