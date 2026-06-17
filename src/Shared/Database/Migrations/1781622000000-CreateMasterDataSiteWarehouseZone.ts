import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMasterDataSiteWarehouseZone1781622000000 implements MigrationInterface {
  name = 'CreateMasterDataSiteWarehouseZone1781622000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sites" ("id" character(36) NOT NULL, "site_code" character varying(50) NOT NULL, "site_name" character varying(255) NOT NULL, "status" character varying(30) NOT NULL, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_sites_site_code" UNIQUE ("site_code"), CONSTRAINT "PK_sites_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouses" ("id" character(36) NOT NULL, "site_id" character(36) NOT NULL, "warehouse_code" character varying(50) NOT NULL, "warehouse_name" character varying(255) NOT NULL, "warehouse_type_code" character varying(50) NOT NULL, "status" character varying(30) NOT NULL, "timezone" character varying(100), "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_warehouses_warehouse_code" UNIQUE ("warehouse_code"), CONSTRAINT "PK_warehouses_id" PRIMARY KEY ("id"), CONSTRAINT "FK_warehouses_site_id_sites_id" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE TABLE "zones" ("id" character(36) NOT NULL, "warehouse_id" character(36) NOT NULL, "zone_code" character varying(50) NOT NULL, "zone_name" character varying(255) NOT NULL, "zone_type" character varying(50) NOT NULL, "status" character varying(30) NOT NULL, "sequence" integer, "temperature_class" character varying(50), "compliance_flags" jsonb NOT NULL DEFAULT '{}'::jsonb, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_zones_warehouse_id_zone_code" UNIQUE ("warehouse_id", "zone_code"), CONSTRAINT "PK_zones_id" PRIMARY KEY ("id"), CONSTRAINT "FK_zones_warehouse_id_warehouses_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_warehouses_site_id" ON "warehouses" ("site_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_zones_warehouse_id" ON "zones" ("warehouse_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_zones_warehouse_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warehouses_site_id"`);
    await queryRunner.query(`DROP TABLE "zones"`);
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(`DROP TABLE "sites"`);
  }
}
