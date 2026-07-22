import { randomUUID } from 'crypto';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { IAuditWriter } from '@modules/AccessControl/Application/Interfaces/IAuditWriter';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuthorizationSnapshotResolver } from '@modules/AccessControl/Infrastructure/Authorization/AuthorizationSnapshotResolver';
import { AddAuditActorSnapshotProvenance1784742000000 } from '@shared/Database/Migrations/1784742000000-AddAuditActorSnapshotProvenance';

/** Required live PostgreSQL proof: connection or migration failures fail the suite. */
describe('RH-01 authorization snapshot + provenance (live Postgres)', () => {
  beforeAll(async () => {
    if (!dataSource.isInitialized) await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('applies nullable/no-default provenance schema and validates every historical row', async () => {
    const columns = (await dataSource.query(
      `
        SELECT column_name AS "ColumnName", is_nullable AS "IsNullable", column_default AS "DefaultValue"
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'audit_logs'
          AND column_name IN ('actor_role_codes', 'actor_snapshot_status')
        ORDER BY column_name
      `,
    )) as Array<{ ColumnName: string; IsNullable: string; DefaultValue: string | null }>;
    expect(columns).toEqual([
      { ColumnName: 'actor_role_codes', IsNullable: 'YES', DefaultValue: null },
      { ColumnName: 'actor_snapshot_status', IsNullable: 'NO', DefaultValue: null },
    ]);

    const invalid = (await dataSource.query(
      `
        SELECT COUNT(*)::int AS "Count"
        FROM audit_logs
        WHERE actor_snapshot_status IS NULL
           OR (actor_snapshot_status = 'unresolved') <> (actor_role_codes IS NULL)
           OR (actor_snapshot_status IN ('resolved', 'legacy_unverified')
               AND (actor_role_codes IS NULL OR jsonb_typeof(actor_role_codes) <> 'array'))
      `,
    )) as Array<{ Count: number }>;
    expect(invalid[0].Count).toBe(0);
  });

  it('backfills a historical row and supports a lossless down migration when no unresolved row exists', async () => {
    const schema = `rh01_migration_${randomUUID().replace(/-/g, '')}`;
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(`CREATE SCHEMA "${schema}"`);
      await runner.query(`SET LOCAL search_path TO "${schema}"`);
      await runner.query(`
        CREATE TABLE audit_logs (
          id char(36) PRIMARY KEY,
          actor_role_codes jsonb NOT NULL DEFAULT '[]'::jsonb
        )
      `);
      await runner.query(`INSERT INTO audit_logs (id, actor_role_codes) VALUES ($1, $2::jsonb)`, [
        randomUUID(),
        JSON.stringify(['LEGACY_ROLE']),
      ]);

      const migration = new AddAuditActorSnapshotProvenance1784742000000();
      await migration.up(runner);
      const rows = (await runner.query(
        `SELECT actor_role_codes AS "Codes", actor_snapshot_status AS "Status" FROM audit_logs`,
      )) as Array<{ Codes: string[]; Status: string }>;
      expect(rows).toEqual([{ Codes: ['LEGACY_ROLE'], Status: ActorSnapshotStatus.LegacyUnverified }]);

      await migration.down(runner);
      const columns = (await runner.query(
        `
          SELECT column_name AS "ColumnName", is_nullable AS "IsNullable", column_default AS "DefaultValue"
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = 'audit_logs'
          ORDER BY column_name
        `,
        [schema],
      )) as Array<{ ColumnName: string; IsNullable: string; DefaultValue: string | null }>;
      expect(columns.map((column) => column.ColumnName)).toEqual(['actor_role_codes', 'id']);
      expect(columns.find((column) => column.ColumnName === 'actor_role_codes')).toMatchObject({
        IsNullable: 'NO',
      });
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('rejects a status/value mismatch at the database boundary', async () => {
    await expect(
      dataSource.query(
        `
          INSERT INTO audit_logs (
            id, actor_role_codes, actor_snapshot_status, actor_type, action, object_type, result
          ) VALUES ($1, NULL, $2, 'USER', 'Read', 'Role', 'FAILED')
        `,
        [randomUUID(), ActorSnapshotStatus.Resolved],
      ),
    ).rejects.toThrow();
  });

  it('fails a live down migration closed when unresolved evidence exists, without rewriting it', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        `
          INSERT INTO audit_logs (
            id, actor_role_codes, actor_snapshot_status, actor_type, action, object_type, result
          ) VALUES ($1, NULL, 'unresolved', 'USER', 'Read', 'Role', 'FAILED')
        `,
        [randomUUID()],
      );
      await expect(new AddAuditActorSnapshotProvenance1784742000000().down(runner)).rejects.toThrow(
        'Cannot rollback actor snapshot provenance',
      );
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('rolls a mutation back when the audit append fails', async () => {
    const schema = `rh01_audit_${randomUUID().replace(/-/g, '')}`;
    await dataSource.query(`CREATE SCHEMA "${schema}"`);
    await dataSource.query(`CREATE TABLE "${schema}".mutation_probe (id uuid PRIMARY KEY)`);
    const writer: IAuditWriter = { Append: jest.fn().mockRejectedValue(new Error('forced audit failure')) };
    const audited = new AuditedTransaction(dataSource, writer);
    const mutationId = randomUUID();
    const entry: AuditEntry = {
      ActorRoleCodes: [],
      ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
      ActorType: ActorType.System,
      Action: ActionCode.Create,
      ObjectType: ObjectType.Role,
    };
    try {
      await expect(
        audited.Run(async (manager) => {
          await manager.query(`INSERT INTO "${schema}".mutation_probe (id) VALUES ($1)`, [mutationId]);
          return { result: null, entry };
        }),
      ).rejects.toThrow('forced audit failure');
      const rows = (await dataSource.query(
        `SELECT COUNT(*)::int AS "Count" FROM "${schema}".mutation_probe WHERE id = $1`,
        [mutationId],
      )) as Array<{ Count: number }>;
      expect(rows[0].Count).toBe(0);
    } finally {
      await dataSource.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
  });

  it('keeps role and permission reads on one pre-change snapshot across a concurrent revocation', async () => {
    const userId = randomUUID();
    const permissionRows = (await dataSource.query(
      `SELECT id::text AS "Id", action AS "Action", object_type AS "ObjectType" FROM permissions ORDER BY id LIMIT 1`,
    )) as Array<{ Id: string; Action: ActionCode; ObjectType: ObjectType }>;
    let permission = permissionRows[0];
    let ownsPermission = false;
    if (!permission) {
      permission = { Id: randomUUID(), Action: ActionCode.Read, ObjectType: ObjectType.Role };
      await dataSource.query(
        `INSERT INTO permissions (id, permission_code, action, object_type) VALUES ($1, $2, $3, $4)`,
        [permission.Id, `${permission.Action}:${permission.ObjectType}`, permission.Action, permission.ObjectType],
      );
      ownsPermission = true;
    }
    await dataSource.query(
      `INSERT INTO users (id, first_name, last_name, email_address, password_hash, role) VALUES ($1, 'RH01', 'Probe', $2, NULL, 'User')`,
      [userId, `rh01-${userId}@example.invalid`],
    );

    const roleId = randomUUID();
    const userRoleId = randomUUID();
    const rolePermissionId = randomUUID();
    const roleCode = `RH01_${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    await dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO roles (id, role_code, role_name, is_system, status) VALUES ($1, $2, 'RH-01 RR test', false, 'ACTIVE')`,
        [roleId, roleCode],
      );
      await manager.query(`INSERT INTO role_permissions (id, role_id, permission_id) VALUES ($1, $2, $3)`, [
        rolePermissionId,
        roleId,
        permission.Id.trim(),
      ]);
      await manager.query(`INSERT INTO user_roles (id, user_id, role_id, source) VALUES ($1, $2, $3, 'MANUAL')`, [
        userRoleId,
        userId,
        roleId,
      ]);
    });

    let releaseBarrier!: () => void;
    let signalBarrier!: () => void;
    const barrierReached = new Promise<void>((resolve) => (signalBarrier = resolve));
    const barrierRelease = new Promise<void>((resolve) => (releaseBarrier = resolve));
    const resolver = new AuthorizationSnapshotResolver(dataSource, async () => {
      signalBarrier();
      await barrierRelease;
    });
    let pending: Promise<Awaited<ReturnType<AuthorizationSnapshotResolver['Resolve']>>> | undefined;

    try {
      pending = resolver.Resolve(userId);
      await barrierReached;
      await dataSource.transaction(async (manager) => {
        await manager.query(`UPDATE roles SET status = 'INACTIVE' WHERE id = $1`, [roleId]);
        await manager.query(`DELETE FROM role_permissions WHERE id = $1`, [rolePermissionId]);
      });
      releaseBarrier();
      const snapshot = await pending;

      expect(snapshot.ActiveRoles).toEqual(expect.arrayContaining([{ Id: roleId, RoleCode: roleCode }]));
      expect(snapshot.Permissions).toEqual(
        expect.arrayContaining([{ Action: permission.Action, ObjectType: permission.ObjectType }]),
      );
    } finally {
      releaseBarrier();
      if (pending) await pending.catch(() => undefined);
      await dataSource.query(`DELETE FROM user_roles WHERE id = $1`, [userRoleId]);
      await dataSource.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
      await dataSource.query(`DELETE FROM data_scopes WHERE principal_type = 'ROLE' AND principal_id = $1`, [roleId]);
      await dataSource.query(`DELETE FROM roles WHERE id = $1`, [roleId]);
      await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
      if (ownsPermission) await dataSource.query(`DELETE FROM permissions WHERE id = $1`, [permission.Id]);
    }
  });
});
