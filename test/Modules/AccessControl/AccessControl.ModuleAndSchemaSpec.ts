import TypeOrmDataSource from '@shared/Database/TypeOrmDataSource';
import { AppModule } from '@app/App.module';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';
import { GroupOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/GroupOrmEntity';
import { GroupMemberOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/GroupMemberOrmEntity';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';
import { RoleCatalogVersionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleCatalogVersionOrmEntity';
import { RoleController } from '@modules/AccessControl/Presentation/Controllers/RoleController';
import { PermissionController } from '@modules/AccessControl/Presentation/Controllers/PermissionController';
import { UserRoleController } from '@modules/AccessControl/Presentation/Controllers/UserRoleController';
import { CreateAccessControlRbacSchema1781630000000 } from '@shared/Database/Migrations/1781630000000-CreateAccessControlRbacSchema';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AUTHORIZATION_SNAPSHOT_RESOLVER } from '@modules/AccessControl/Application/Interfaces/IAuthorizationSnapshotResolver';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { AuthorizationSnapshotContextMiddleware } from '@modules/AccessControl/Presentation/Middleware/AuthorizationSnapshotContextMiddleware';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AutoMigration1784740000987 } from '@shared/Database/Migrations/1784740000987-AutoMigration';
import { readFileSync } from 'fs';
import { join } from 'path';

const captureMigrationSql = async (direction: 'up' | 'down'): Promise<string> => {
  const migration = new CreateAccessControlRbacSchema1781630000000();
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(sql);
    }),
  };
  await migration[direction](queryRunner as never);
  return queries.join('\n').toLowerCase();
};

const captureRoleCatalogMigrationSql = async (direction: 'up' | 'down'): Promise<string> => {
  const migration = new AutoMigration1784740000987();
  const queries: string[] = [];
  await migration[direction]({ query: async (sql: string) => void queries.push(sql) } as never);
  return queries.join('\n').toLowerCase();
};

describe('AccessControl module and schema registration', () => {
  it('registers AccessControlModule in AppModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    expect(imports).toEqual(expect.arrayContaining([AccessControlModule]));
  });

  it('registers all RBAC ORM entities including the role-catalog singleton in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([
        RoleOrmEntity,
        PermissionOrmEntity,
        RolePermissionOrmEntity,
        UserRoleOrmEntity,
        GroupOrmEntity,
        GroupMemberOrmEntity,
        DataScopeOrmEntity,
        RoleCatalogVersionOrmEntity,
      ]),
    );
  });

  it('exposes role, permission and user-role controllers', () => {
    const controllers = (Reflect.getMetadata('controllers', AccessControlModule) as Array<{ name: string }>) ?? [];
    const names = controllers.map((controller) => controller.name);
    expect(names).toEqual(
      expect.arrayContaining([RoleController.name, PermissionController.name, UserRoleController.name]),
    );
  });

  it('registers the request snapshot context, resolver adapter, middleware and mandatory audited guard dependency', () => {
    const providers = (Reflect.getMetadata('providers', AccessControlModule) as unknown[]) ?? [];
    expect(providers).toEqual(
      expect.arrayContaining([
        AuthorizationSnapshotContext,
        AuthorizationSnapshotContextMiddleware,
        AuditedTransaction,
        expect.objectContaining({ provide: AUTHORIZATION_SNAPSHOT_RESOLVER }),
      ]),
    );
  });

  it('exports every request-snapshot dependency needed when PermissionGuard is consumed by another module', () => {
    const exports = (Reflect.getMetadata('exports', AccessControlModule) as unknown[]) ?? [];
    expect(exports).toEqual(
      expect.arrayContaining([AUTHORIZATION_SNAPSHOT_RESOLVER, AuthorizationSnapshotContext, AuditedTransaction]),
    );
  });

  it('registers the request snapshot middleware on every HTTP route', () => {
    const forRoutes = jest.fn();
    const apply = jest.fn(() => ({ forRoutes }));
    new AccessControlModule().configure({ apply } as never);
    expect(apply).toHaveBeenCalledWith(AuthorizationSnapshotContextMiddleware);
    expect(forRoutes).toHaveBeenCalledWith('*');
  });

  it('requires UserAssignment permission on the user-role mutation endpoints (C2 PermissionGuard)', () => {
    const assignMeta = Reflect.getMetadata(REQUIRE_PERMISSION_KEY, UserRoleController.prototype.AssignRole);
    const removeMeta = Reflect.getMetadata(REQUIRE_PERMISSION_KEY, UserRoleController.prototype.RemoveRole);
    expect(assignMeta).toMatchObject({ Action: ActionCode.Update, ObjectType: ObjectType.UserAssignment });
    expect(removeMeta).toMatchObject({ Action: ActionCode.Update, ObjectType: ObjectType.UserAssignment });
  });

  it('does not expose any permission-guard/enforcement controller in C1', () => {
    const controllers = (Reflect.getMetadata('controllers', AccessControlModule) as Array<{ name: string }>) ?? [];
    const names = controllers.map((controller) => controller.name);
    expect(names).not.toEqual(expect.arrayContaining(['PermissionGuardController', 'DataScopeController']));
  });

  it('migration up creates roles/permissions with unique constraints', async () => {
    const sql = await captureMigrationSql('up');

    expect(sql).toContain('create table "roles"');
    expect(sql).toContain('"role_code"');
    expect(sql).toContain('"is_system"');
    expect(sql).toContain('unique ("role_code")');

    expect(sql).toContain('create table "permissions"');
    expect(sql).toContain('"permission_code"');
    expect(sql).toContain('"action"');
    expect(sql).toContain('"object_type"');
    expect(sql).toContain('unique ("permission_code")');
    expect(sql).toContain('unique ("action", "object_type")');
  });

  it('migration up creates role_permissions and user_roles with FKs and unique pairs', async () => {
    const sql = await captureMigrationSql('up');

    expect(sql).toContain('create table "role_permissions"');
    expect(sql).toContain('unique ("role_id", "permission_id")');
    expect(sql).toContain('foreign key ("role_id") references "roles"("id")');
    expect(sql).toContain('foreign key ("permission_id") references "permissions"("id")');

    expect(sql).toContain('create table "user_roles"');
    expect(sql).toContain('unique ("user_id", "role_id")');
    expect(sql).toContain('foreign key ("user_id") references "users"("id")');
    expect(sql).toContain('"source"');
  });

  it('migration up creates schema-only groups, group_members and data_scopes', async () => {
    const sql = await captureMigrationSql('up');

    expect(sql).toContain('create table "groups"');
    expect(sql).toContain('create table "group_members"');
    expect(sql).toContain('unique ("group_id", "user_id")');
    expect(sql).toContain('create table "data_scopes"');
    expect(sql).toContain('"principal_type"');
    expect(sql).toContain('"scope_type"');
    expect(sql).toContain('"include_all"');
  });

  it('migration up never alters the existing users table', async () => {
    const sql = await captureMigrationSql('up');
    expect(sql).not.toContain('alter table "users"');
    expect(sql).not.toContain('drop table "users"');
  });

  it('migration down drops every RBAC table and leaves users intact', async () => {
    const sql = await captureMigrationSql('down');
    for (const table of [
      'data_scopes',
      'group_members',
      'groups',
      'user_roles',
      'role_permissions',
      'permissions',
      'roles',
    ]) {
      expect(sql).toContain(`drop table "${table}"`);
    }
    expect(sql).not.toContain('drop table "users"');
  });

  it('RH-05 migration repairs singleton constraints and protects every current role reference', async () => {
    const sql = await captureRoleCatalogMigrationSql('up');
    expect(sql).toContain('check ("id" = 1)');
    expect(sql).toContain('check ("version" >= 0)');
    expect(sql).toContain('primary key ("id")');
    expect(sql).toContain('fk_exception_cases_assigned_role_id_roles_id');
    expect(sql).toContain('on delete restrict');
    expect(sql).toContain('trg_data_scopes_role_reference');
    expect(sql).toContain('for key share');
    expect(sql).toContain('left join "roles"');

    const down = await captureRoleCatalogMigrationSql('down');
    expect(down).not.toContain('on delete cascade');
    expect(down).toContain('drop trigger if exists "trg_data_scopes_role_reference"');
    expect(down).toContain('drop function if exists "enforce_data_scope_role_reference"');
  });

  it('docker startup gates API traffic on a compiled one-shot migration and seed stage', () => {
    const compose = readFileSync(join(process.cwd(), 'docker-compose.yml'), 'utf8');
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['migration:run:compiled']).toContain('dist/Shared/Database/TypeOrmDataSource.js');
    expect(packageJson.scripts['seed:run:compiled']).toContain('dist/Shared/Database/Seed/Seed.js');
    expect(compose).toContain('catalog-setup:');
    expect(compose).toContain('condition: service_completed_successfully');
    expect(compose).toContain('yarn migration:run:compiled && yarn seed:run:compiled');
  });
});
