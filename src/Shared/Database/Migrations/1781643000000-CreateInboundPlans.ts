import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInboundPlans1781643000000 implements MigrationInterface {
  public name = 'CreateInboundPlans1781643000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inbound_plans" (
        "id" char(36) NOT NULL,
        "source_system" varchar(100) NOT NULL,
        "source_document_type" varchar(40) NOT NULL,
        "source_document_number" varchar(100) NOT NULL,
        "business_reference" varchar(160) NOT NULL,
        "supplier_id" char(36) NOT NULL,
        "supplier_code" varchar(80),
        "owner_id" char(36) NOT NULL,
        "owner_code" varchar(80),
        "warehouse_id" char(36) NOT NULL,
        "warehouse_code" varchar(80),
        "warehouse_profile_id" char(36),
        "expected_arrival_at" TIMESTAMP WITH TIME ZONE,
        "status" varchar(30) NOT NULL,
        "gate_in_status" varchar(30) NOT NULL,
        "gate_in_at" TIMESTAMP WITH TIME ZONE,
        "gate_reference" varchar(100),
        "vehicle_number" varchar(80),
        "driver_name" varchar(120),
        "evidence_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "core_flow_instance_id" char(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" char(36),
        "updated_by" char(36),
        CONSTRAINT "PK_inbound_plans" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "inbound_plan_lines" (
        "id" char(36) NOT NULL,
        "inbound_plan_id" char(36) NOT NULL,
        "line_number" integer NOT NULL,
        "sku_id" char(36) NOT NULL,
        "sku_code" varchar(80),
        "uom_id" char(36) NOT NULL,
        "uom_code" varchar(40),
        "expected_quantity" numeric(18,4) NOT NULL,
        "external_line_reference" varchar(100),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inbound_plan_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inbound_plan_lines_plan" FOREIGN KEY ("inbound_plan_id")
          REFERENCES "inbound_plans"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inbound_plans_business_key" ON "inbound_plans" ("source_system", "source_document_type", "source_document_number", "owner_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inbound_plans_source_status" ON "inbound_plans" ("source_system", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inbound_plans_owner_warehouse" ON "inbound_plans" ("owner_id", "warehouse_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_inbound_plan_lines_plan" ON "inbound_plan_lines" ("inbound_plan_id")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inbound_plan_lines_plan_line" ON "inbound_plan_lines" ("inbound_plan_id", "line_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_inbound_plan_lines_plan_line"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inbound_plan_lines_plan"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inbound_plans_owner_warehouse"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_inbound_plans_source_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_inbound_plans_business_key"`);
    await queryRunner.query(`DROP TABLE "inbound_plan_lines"`);
    await queryRunner.query(`DROP TABLE "inbound_plans"`);
  }
}
