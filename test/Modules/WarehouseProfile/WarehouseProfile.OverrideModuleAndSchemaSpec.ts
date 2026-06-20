import TypeOrmDataSource from '@shared/Database/TypeOrmDataSource';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import { OverrideLogOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/OverrideLogOrmEntity';
import { OverrideController } from '@modules/WarehouseProfile/Presentation/Controllers/OverrideController';
import { CreateOverrideLogs1781635000000 } from '@shared/Database/Migrations/1781635000000-CreateOverrideLogs';

const RunMigration = async (direction: 'up' | 'down'): Promise<string> => {
  const migration = new CreateOverrideLogs1781635000000();
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(sql);
    }),
  };
  await migration[direction](queryRunner as never);
  return queries.join('\n').toLowerCase();
};

describe('Override control module and schema registration (C7)', () => {
  it('registers OverrideLogOrmEntity in TypeOrmDataSource', () => {
    expect(TypeOrmDataSource.options.entities).toEqual(expect.arrayContaining([OverrideLogOrmEntity]));
  });

  it('exposes OverrideController on WarehouseProfileModule', () => {
    const controllers = (Reflect.getMetadata('controllers', WarehouseProfileModule) as Array<{ name: string }>) ?? [];
    const names = controllers.map((controller) => controller.name);
    expect(names).toEqual(expect.arrayContaining([OverrideController.name]));
  });

  it('creates override_logs with the rule/actor/target/reason/evidence/approval/before-after/audit columns', async () => {
    const sql = await RunMigration('up');
    expect(sql).toContain('create table "override_logs"');
    expect(sql).toContain('"rule_id"');
    expect(sql).toContain('"rule_code"');
    expect(sql).toContain('"actor_user_id"');
    expect(sql).toContain('"target_object_type"');
    expect(sql).toContain('"target_object_id"');
    expect(sql).toContain('"control_mode"');
    expect(sql).toContain('"reason_code_id"');
    expect(sql).toContain('"evidence_refs" jsonb');
    expect(sql).toContain('"approval_request_id"');
    expect(sql).toContain('"before_json" jsonb');
    expect(sql).toContain('"after_json" jsonb');
    expect(sql).toContain('"audit_ref"');
    expect(sql).toContain('"correlation_id"');
  });

  it('creates the FR-19 frequency indexes', async () => {
    const sql = await RunMigration('up');
    expect(sql).toContain('idx_override_logs_rule');
    expect(sql).toContain('idx_override_logs_actor');
    expect(sql).toContain('idx_override_logs_target');
    expect(sql).toContain('idx_override_logs_created_at');
  });

  it('creates the UPDATE/DELETE-blocking immutability trigger (AC1)', async () => {
    const sql = await RunMigration('up');
    expect(sql).toContain('create trigger "trg_prevent_override_log_update_delete"');
    expect(sql).toContain('before update or delete on "override_logs"');
    expect(sql).toContain('append-only');
  });

  it('migration down drops the trigger, function and table', async () => {
    const sql = await RunMigration('down');
    expect(sql).toContain('drop trigger if exists "trg_prevent_override_log_update_delete"');
    expect(sql).toContain('drop function if exists "prevent_override_log_update_delete"');
    expect(sql).toContain('drop table "override_logs"');
  });
});
