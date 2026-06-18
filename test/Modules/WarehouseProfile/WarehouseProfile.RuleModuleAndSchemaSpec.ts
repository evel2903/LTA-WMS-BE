import TypeOrmDataSource from '@shared/Database/TypeOrmDataSource';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';
import { RuleGroupController } from '@modules/WarehouseProfile/Presentation/Controllers/RuleGroupController';
import { RuleDefinitionController } from '@modules/WarehouseProfile/Presentation/Controllers/RuleDefinitionController';
import { WarehouseProfileRuleController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileRuleController';
import { CreateRuleGroupDefinitionAndProfileRule1781629000000 } from '@shared/Database/Migrations/1781629000000-CreateRuleGroupDefinitionAndProfileRule';

const RunMigrationUp = async (): Promise<string> => {
  const migration = new CreateRuleGroupDefinitionAndProfileRule1781629000000();
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(sql);
    }),
  };
  await migration.up(queryRunner as never);
  return queries.join('\n').toLowerCase();
};

describe('Rule engine module and schema registration', () => {
  it('registers the three rule ORM entities in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(
      expect.arrayContaining([RuleGroupOrmEntity, RuleDefinitionOrmEntity, WarehouseProfileRuleOrmEntity]),
    );
  });

  it('exposes the three rule controllers on WarehouseProfileModule', () => {
    const controllers = (Reflect.getMetadata('controllers', WarehouseProfileModule) as Array<{ name: string }>) ?? [];
    const names = controllers.map((controller) => controller.name);
    expect(names).toEqual(
      expect.arrayContaining([
        RuleGroupController.name,
        RuleDefinitionController.name,
        WarehouseProfileRuleController.name,
      ]),
    );
  });

  it('does not expose any resolver/preview/activation controller in B2', () => {
    const controllers = (Reflect.getMetadata('controllers', WarehouseProfileModule) as Array<{ name: string }>) ?? [];
    const names = controllers.map((controller) => controller.name);
    expect(names).not.toEqual(
      expect.arrayContaining(['RuleResolverController', 'RulePreviewController', 'RuleEvaluationController']),
    );
  });

  it('creates rule_groups with group_code unique index', async () => {
    const sql = await RunMigrationUp();
    expect(sql).toContain('create table "rule_groups"');
    expect(sql).toContain('"group_code"');
    expect(sql).toContain('"group_name"');
    expect(sql).toContain('"catalog_state"');
    expect(sql).toContain('"display_order"');
    expect(sql).toContain('unique ("group_code")');
  });

  it('creates rule_definitions with all six configuration axes and scope_key', async () => {
    const sql = await RunMigrationUp();
    expect(sql).toContain('create table "rule_definitions"');
    expect(sql).toContain('"rule_code"');
    expect(sql).toContain('"rule_group_id"');
    expect(sql).toContain('"precedence_tier"');
    expect(sql).toContain('"control_mode"');
    // six axes
    expect(sql).toContain('"warehouse_type_code"');
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
    // payload + lifecycle
    expect(sql).toContain('"condition_json" jsonb');
    expect(sql).toContain('"action_json" jsonb');
    expect(sql).toContain('"priority"');
    expect(sql).toContain('"status"');
    expect(sql).toContain('"requires_reason"');
    expect(sql).toContain('"requires_evidence"');
    expect(sql).toContain('"allow_override"');
    // unique + FK + indexes
    expect(sql).toContain('unique ("rule_code")');
    expect(sql).toContain('foreign key ("rule_group_id") references "rule_groups"("id")');
    expect(sql).toContain('foreign key ("warehouse_id") references "warehouses"("id")');
    expect(sql).toContain('foreign key ("zone_id") references "zones"("id")');
    expect(sql).toContain('foreign key ("owner_id") references "owners"("id")');
    expect(sql).toContain('foreign key ("sku_id") references "skus"("id")');
    expect(sql).toContain('idx_rule_definitions_scope_key');
    expect(sql).toContain('idx_rule_definitions_rule_group_id');
  });

  it('creates warehouse_profile_rules with composite unique and CASCADE/RESTRICT FKs', async () => {
    const sql = await RunMigrationUp();
    expect(sql).toContain('create table "warehouse_profile_rules"');
    expect(sql).toContain('"warehouse_profile_id"');
    expect(sql).toContain('"rule_definition_id"');
    expect(sql).toContain('"is_enabled"');
    expect(sql).toContain('"override_priority"');
    expect(sql).toContain('unique ("warehouse_profile_id", "rule_definition_id")');
    expect(sql).toContain(
      'foreign key ("warehouse_profile_id") references "warehouse_profiles"("id") on delete cascade',
    );
    expect(sql).toContain('foreign key ("rule_definition_id") references "rule_definitions"("id") on delete restrict');
  });

  it('migration down drops all three rule tables', async () => {
    const migration = new CreateRuleGroupDefinitionAndProfileRule1781629000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };
    await migration.down(queryRunner as never);
    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('drop table "warehouse_profile_rules"');
    expect(sql).toContain('drop table "rule_definitions"');
    expect(sql).toContain('drop table "rule_groups"');
  });
});
