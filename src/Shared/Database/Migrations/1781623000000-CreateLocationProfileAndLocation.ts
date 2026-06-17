import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLocationProfileAndLocation1781623000000 implements MigrationInterface {
  name = 'CreateLocationProfileAndLocation1781623000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "location_profiles" ("id" character(36) NOT NULL, "profile_code" character varying(50) NOT NULL, "profile_name" character varying(255) NOT NULL, "location_type" character varying(50) NOT NULL, "version" integer NOT NULL DEFAULT 1, "status" character varying(30) NOT NULL, "capacity_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "eligibility_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "mix_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "compliance_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "operation_policy" jsonb NOT NULL DEFAULT '{}'::jsonb, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_location_profiles_profile_code" UNIQUE ("profile_code"), CONSTRAINT "PK_location_profiles_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" character(36) NOT NULL, "warehouse_id" character(36) NOT NULL, "zone_id" character(36) NOT NULL, "parent_location_id" character(36), "location_code" character varying(80) NOT NULL, "location_name" character varying(255) NOT NULL, "location_type" character varying(50) NOT NULL, "location_profile_id" character(36) NOT NULL, "location_status" character varying(30) NOT NULL, "capacity_qty" numeric(18,3), "capacity_volume" numeric(18,6), "capacity_weight" numeric(18,3), "pallet_slot" integer, "temperature_class" character varying(50), "dg_compatibility_group" character varying(50), "bonded_flag" boolean NOT NULL DEFAULT false, "owner_restriction" character varying(100), "mix_sku_policy" character varying(50), "mix_lot_policy" character varying(50), "mix_owner_policy" character varying(50), "pick_sequence" integer, "putaway_sequence" integer, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_locations_warehouse_id_location_code" UNIQUE ("warehouse_id", "location_code"), CONSTRAINT "PK_locations_id" PRIMARY KEY ("id"), CONSTRAINT "FK_locations_warehouse_id_warehouses_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_locations_zone_id_zones_id" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_locations_location_profile_id_location_profiles_id" FOREIGN KEY ("location_profile_id") REFERENCES "location_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_locations_parent_location_id_locations_id" FOREIGN KEY ("parent_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_locations_warehouse_id" ON "locations" ("warehouse_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_locations_zone_id" ON "locations" ("zone_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_locations_parent_location_id" ON "locations" ("parent_location_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_locations_location_profile_id" ON "locations" ("location_profile_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_location_profile_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_parent_location_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_zone_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_warehouse_id"`);
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TABLE "location_profiles"`);
  }
}
