import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C1 RBAC schema: roles, permissions, role_permissions, user_roles and the
 * schema-only groups/group_members/data_scopes (architecture 6.1). DDL only —
 * the six core roles, permission catalog, role→permission matrix and the legacy
 * `users.role` → user_roles bridge are seeded idempotently by the seed script,
 * after roles exist. This migration never touches the existing `users` table.
 */
export class CreateAccessControlRbacSchema1781630000000 implements MigrationInterface {
  name = 'CreateAccessControlRbacSchema1781630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" character(36) NOT NULL, "role_code" character varying(50) NOT NULL, "role_name" character varying(255) NOT NULL, "description" character varying(500), "is_system" boolean NOT NULL DEFAULT false, "status" character varying(30) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_roles_role_code" UNIQUE ("role_code"), CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" character(36) NOT NULL, "permission_code" character varying(160) NOT NULL, "action" character varying(30) NOT NULL, "object_type" character varying(50) NOT NULL, "description" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_permissions_permission_code" UNIQUE ("permission_code"), CONSTRAINT "UQ_permissions_action_object" UNIQUE ("action", "object_type"), CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("id" character(36) NOT NULL, "role_id" character(36) NOT NULL, "permission_id" character(36) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), CONSTRAINT "UQ_role_permissions_role_permission" UNIQUE ("role_id", "permission_id"), CONSTRAINT "PK_role_permissions_id" PRIMARY KEY ("id"), CONSTRAINT "FK_role_permissions_role_id_roles_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_role_permissions_permission_id_permissions_id" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_role_id" ON "role_permissions" ("role_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_permission_id" ON "role_permissions" ("permission_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "user_roles" ("id" character(36) NOT NULL, "user_id" character(36) NOT NULL, "role_id" character(36) NOT NULL, "source" character varying(30) NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "assigned_by" character(36), CONSTRAINT "UQ_user_roles_user_role" UNIQUE ("user_id", "role_id"), CONSTRAINT "PK_user_roles_id" PRIMARY KEY ("id"), CONSTRAINT "FK_user_roles_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_user_roles_role_id_roles_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id")`);

    await queryRunner.query(
      `CREATE TABLE "groups" ("id" character(36) NOT NULL, "group_code" character varying(50) NOT NULL, "group_name" character varying(255) NOT NULL, "description" character varying(500), "status" character varying(30) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "UQ_groups_group_code" UNIQUE ("group_code"), CONSTRAINT "PK_groups_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "group_members" ("id" character(36) NOT NULL, "group_id" character(36) NOT NULL, "user_id" character(36) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), CONSTRAINT "UQ_group_members_group_user" UNIQUE ("group_id", "user_id"), CONSTRAINT "PK_group_members_id" PRIMARY KEY ("id"), CONSTRAINT "FK_group_members_group_id_groups_id" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_group_members_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_group_members_group_id" ON "group_members" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_group_members_user_id" ON "group_members" ("user_id")`);

    await queryRunner.query(
      `CREATE TABLE "data_scopes" ("id" character(36) NOT NULL, "principal_type" character varying(30) NOT NULL, "principal_id" character(36) NOT NULL, "scope_type" character varying(30) NOT NULL, "scope_value_id" character(36), "scope_value_code" character varying(100), "include_all" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character(36), "updated_by" character(36), CONSTRAINT "PK_data_scopes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_data_scopes_principal" ON "data_scopes" ("principal_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_data_scopes_principal"`);
    await queryRunner.query(`DROP TABLE "data_scopes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_group_members_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_group_members_group_id"`);
    await queryRunner.query(`DROP TABLE "group_members"`);
    await queryRunner.query(`DROP TABLE "groups"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_roles_role_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_roles_user_id"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_permissions_permission_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_permissions_role_id"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
