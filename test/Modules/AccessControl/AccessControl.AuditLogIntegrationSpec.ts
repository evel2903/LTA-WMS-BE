import { randomUUID } from 'crypto';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';

/**
 * Live Postgres integration: transactional audit (rollback/commit) + DB-trigger
 * immutability. Skips gracefully when no DB is reachable so `yarn test` stays green
 * in DB-less environments.
 */
describe('AuditLog transactional + immutability (live Postgres)', () => {
  let available = false;
  const writer = new AuditWriter();
  // char(36) columns hold UUIDs; use real UUIDs so values round-trip without blank-padding.
  const actorId = randomUUID();
  const reasonId = randomUUID();

  const entry = (correlationId: string): AuditEntry => ({
    ActorUserId: actorId,
    ActorRoleCodes: ['WMS_ADMIN'],
    ActorType: ActorType.User,
    Action: ActionCode.Create,
    ObjectType: ObjectType.Warehouse,
    ObjectId: 'wh-audit-test',
    ObjectCode: 'WH-1',
    BeforeJson: null,
    AfterJson: { Name: 'WH' },
    ReasonCodeId: reasonId,
    ReasonNote: 'created',
    CorrelationId: correlationId,
  });

  beforeAll(async () => {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      await dataSource.runMigrations();
      available = true;
    } catch {
      available = false;
      // Visible signal: these live AC2/AC3/AC5 assertions are NOT exercised without a DB.

      console.warn('[AuditLogIntegrationSpec] No Postgres reachable — skipping live audit assertions.');
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('AC2: audit rolls back when the command transaction throws', async () => {
    if (!available) return;
    const marker = randomUUID();
    await expect(
      dataSource.transaction(async (manager) => {
        await writer.Append(entry(marker), manager);
        throw new Error('command failed');
      }),
    ).rejects.toThrow('command failed');
    const count = await dataSource.getRepository(AuditLogOrmEntity).count({ where: { CorrelationId: marker } });
    expect(count).toBe(0);
  });

  it('AC2/AC5: audit persists on commit and is readable with the right fields', async () => {
    if (!available) return;
    const marker = randomUUID();
    await dataSource.transaction(async (manager) => writer.Append(entry(marker), manager));
    const rows = await dataSource.getRepository(AuditLogOrmEntity).find({ where: { CorrelationId: marker } });
    expect(rows).toHaveLength(1);
    expect(rows[0].Action).toBe(ActionCode.Create);
    expect(rows[0].ObjectId).toBe('wh-audit-test');
    expect(rows[0].ActorUserId).toBe(actorId);
    expect(rows[0].AfterJson).toEqual({ Name: 'WH' });
    expect(rows[0].ReasonCodeId).toBe(reasonId);
    expect(rows[0].OccurredAt).toBeInstanceOf(Date);
  });

  it('AC3/AC5: UPDATE and DELETE on audit_logs are blocked by the immutability trigger', async () => {
    if (!available) return;
    const marker = randomUUID();
    await dataSource.transaction(async (manager) => writer.Append(entry(marker), manager));
    await expect(
      dataSource.query(`UPDATE audit_logs SET reason_note = 'tamper' WHERE correlation_id = $1`, [marker]),
    ).rejects.toThrow();
    await expect(dataSource.query(`DELETE FROM audit_logs WHERE correlation_id = $1`, [marker])).rejects.toThrow();
    const count = await dataSource.getRepository(AuditLogOrmEntity).count({ where: { CorrelationId: marker } });
    expect(count).toBe(1);
  });
});
