import TypeOrmDataSource from '@shared/Database/TypeOrmDataSource';
import { AppModule } from '@app/App.module';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';
import { WarehouseProfileController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileController';
import { WarehouseProfileAssignmentController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileAssignmentController';
import { CreateWarehouseProfileAndAssignment1781628000000 } from '@shared/Database/Migrations/1781628000000-CreateWarehouseProfileAndAssignment';

describe('WarehouseProfile module and schema registration', () => {
  it('registers WarehouseProfileModule in AppModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    expect(imports).toEqual(expect.arrayContaining([WarehouseProfileModule]));
  });

  it('registers WarehouseProfile and assignment ORM entities in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([WarehouseProfileOrmEntity, WarehouseProfileAssignmentOrmEntity]),
    );
  });

  it('exposes profile and assignment controllers', () => {
    const controllers = (Reflect.getMetadata('controllers', WarehouseProfileModule) as Array<{ name: string }>) ?? [];
    const names = controllers.map((controller) => controller.name);
    expect(names).toEqual(
      expect.arrayContaining([WarehouseProfileController.name, WarehouseProfileAssignmentController.name]),
    );
  });

  it('does not expose any activate/deactivate controller in B1', () => {
    const controllers = (Reflect.getMetadata('controllers', WarehouseProfileModule) as Array<{ name: string }>) ?? [];
    const names = controllers.map((controller) => controller.name);
    expect(names).not.toEqual(
      expect.arrayContaining(['WarehouseProfileActivationController', 'WarehouseProfileLifecycleController']),
    );
  });

  it('provides a migration that creates warehouse_profiles with header, scope, JSONB config and audit columns', async () => {
    const migration = new CreateWarehouseProfileAndAssignment1781628000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);
    const sql = queries.join('\n').toLowerCase();

    expect(sql).toContain('create table "warehouse_profiles"');
    // header
    expect(sql).toContain('"profile_code"');
    expect(sql).toContain('"profile_name"');
    expect(sql).toContain('"warehouse_type_code"');
    expect(sql).toContain('"version"');
    expect(sql).toContain('"status"');
    expect(sql).toContain('"effective_from"');
    expect(sql).toContain('"effective_to"');
    expect(sql).toContain('unique ("profile_code")');
    // scope
    expect(sql).toContain('"warehouse_id"');
    expect(sql).toContain('"zone_id"');
    expect(sql).toContain('"location_type"');
    expect(sql).toContain('"owner_id"');
    expect(sql).toContain('"sku_id"');
    expect(sql).toContain('"item_class"');
    expect(sql).toContain('"order_type"');
    expect(sql).toContain('"customer_id"');
    expect(sql).toContain('"supplier_id"');
    expect(sql).toContain('"scope_key"');
    // 7 config JSONB
    expect(sql).toContain('"capability_flags" jsonb');
    expect(sql).toContain('"strategy_policy" jsonb');
    expect(sql).toContain('"threshold_policy" jsonb');
    expect(sql).toContain('"approval_policy" jsonb');
    expect(sql).toContain('"label_device_policy" jsonb');
    expect(sql).toContain('"integration_policy" jsonb');
    expect(sql).toContain('"audit_policy" jsonb');
    // audit metadata
    expect(sql).toContain('"source_system"');
    expect(sql).toContain('"reference_id"');
    expect(sql).toContain('"created_by"');
    expect(sql).toContain('"updated_by"');
    // scope reference FKs
    expect(sql).toContain('foreign key ("warehouse_id") references "warehouses"("id")');
    expect(sql).toContain('foreign key ("zone_id") references "zones"("id")');
    expect(sql).toContain('foreign key ("owner_id") references "owners"("id")');
    expect(sql).toContain('foreign key ("sku_id") references "skus"("id")');
  });

  it('provides a migration that creates warehouse_profile_assignments with FK to profile and warehouse', async () => {
    const migration = new CreateWarehouseProfileAndAssignment1781628000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);
    const sql = queries.join('\n').toLowerCase();

    expect(sql).toContain('create table "warehouse_profile_assignments"');
    expect(sql).toContain('"warehouse_profile_id"');
    expect(sql).toContain('"assignment_type"');
    expect(sql).toContain('"warehouse_type_code"');
    expect(sql).toContain('"warehouse_id"');
    expect(sql).toContain('"scope_key"');
    expect(sql).toContain('foreign key ("warehouse_profile_id") references "warehouse_profiles"("id")');
    expect(sql).toContain('foreign key ("warehouse_id") references "warehouses"("id")');
  });

  it('migration down drops both tables', async () => {
    const migration = new CreateWarehouseProfileAndAssignment1781628000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.down(queryRunner as never);
    const sql = queries.join('\n').toLowerCase();

    expect(sql).toContain('drop table "warehouse_profile_assignments"');
    expect(sql).toContain('drop table "warehouse_profiles"');
  });
});
