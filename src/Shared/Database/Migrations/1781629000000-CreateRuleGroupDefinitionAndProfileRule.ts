import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRuleGroupDefinitionAndProfileRule1781629000000 implements MigrationInterface {
  name = 'CreateRuleGroupDefinitionAndProfileRule1781629000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rule_groups" ("id" character(36) NOT NULL, "group_code" character varying(50) NOT NULL, "group_name" character varying(255) NOT NULL, "description" character varying(500), "catalog_state" character varying(30) NOT NULL, "display_order" integer, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_rule_groups_group_code" UNIQUE ("group_code"), CONSTRAINT "PK_rule_groups_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "rule_definitions" ("id" character(36) NOT NULL, "rule_code" character varying(80) NOT NULL, "rule_name" character varying(255) NOT NULL, "rule_group_id" character(36) NOT NULL, "precedence_tier" character varying(30) NOT NULL, "control_mode" character varying(30) NOT NULL, "warehouse_type_code" character varying(50), "warehouse_id" character(36), "zone_id" character(36), "location_type" character varying(50), "owner_id" character(36), "sku_id" character(36), "item_class" character varying(50), "order_type" character varying(50), "customer_id" character(36), "supplier_id" character(36), "scope_key" character varying(128) NOT NULL, "condition_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "action_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "priority" integer NOT NULL DEFAULT 100, "status" character varying(30) NOT NULL, "effective_from" TIMESTAMP WITH TIME ZONE NOT NULL, "effective_to" TIMESTAMP WITH TIME ZONE, "requires_reason" boolean NOT NULL DEFAULT false, "requires_evidence" boolean NOT NULL DEFAULT false, "allow_override" boolean NOT NULL DEFAULT false, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_rule_definitions_rule_code" UNIQUE ("rule_code"), CONSTRAINT "PK_rule_definitions_id" PRIMARY KEY ("id"), CONSTRAINT "FK_rule_definitions_rule_group_id_rule_groups_id" FOREIGN KEY ("rule_group_id") REFERENCES "rule_groups"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_rule_definitions_warehouse_id_warehouses_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_rule_definitions_zone_id_zones_id" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_rule_definitions_owner_id_owners_id" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_rule_definitions_sku_id_skus_id" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_rule_definitions_scope_key" ON "rule_definitions" ("scope_key")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_rule_definitions_rule_group_id" ON "rule_definitions" ("rule_group_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "warehouse_profile_rules" ("id" character(36) NOT NULL, "warehouse_profile_id" character(36) NOT NULL, "rule_definition_id" character(36) NOT NULL, "is_enabled" boolean NOT NULL DEFAULT true, "override_priority" integer, "source_system" character varying(100), "reference_id" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_warehouse_profile_rules_profile_rule" UNIQUE ("warehouse_profile_id", "rule_definition_id"), CONSTRAINT "PK_warehouse_profile_rules_id" PRIMARY KEY ("id"), CONSTRAINT "FK_warehouse_profile_rules_warehouse_profile_id_warehouse_profiles_id" FOREIGN KEY ("warehouse_profile_id") REFERENCES "warehouse_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_warehouse_profile_rules_rule_definition_id_rule_definitions_id" FOREIGN KEY ("rule_definition_id") REFERENCES "rule_definitions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_profile_rules_warehouse_profile_id" ON "warehouse_profile_rules" ("warehouse_profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_profile_rules_rule_definition_id" ON "warehouse_profile_rules" ("rule_definition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_warehouse_profile_rules_rule_definition_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warehouse_profile_rules_warehouse_profile_id"`);
    await queryRunner.query(`DROP TABLE "warehouse_profile_rules"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rule_definitions_rule_group_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_rule_definitions_scope_key"`);
    await queryRunner.query(`DROP TABLE "rule_definitions"`);
    await queryRunner.query(`DROP TABLE "rule_groups"`);
  }
}
