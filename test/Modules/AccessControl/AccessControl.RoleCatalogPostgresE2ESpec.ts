import { randomUUID } from 'crypto';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { CatalogVersionExhaustedException, ConflictException } from '@common/Exceptions/AppException';
import { RoleCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleCatalogRepository';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { RoleCatalogTokenCodec } from '@modules/AccessControl/Infrastructure/Crypto/RoleCatalogTokenCodec';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@modules/AccessControl/Application/UseCases/UpdateRoleUseCase';
import { DeleteRoleUseCase } from '@modules/AccessControl/Application/UseCases/DeleteRoleUseCase';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';

const live = process.env.RH05_DATABASE_E2E === '1' ? describe : describe.skip;

live('RH-05 live PostgreSQL role catalog', () => {
  let catalog: RoleCatalogRepository;
  let roles: RoleRepository;
  let audited: AuditedTransaction;

  beforeAll(async () => {
    await dataSource.initialize();
    const database = (await dataSource.query(`SELECT current_database() AS "Database"`)) as Array<{
      Database: string;
    }>;
    expect(database[0]?.Database).toMatch(/rh05/i);
    catalog = new RoleCatalogRepository(dataSource);
    roles = new RoleRepository(dataSource.getRepository(RoleOrmEntity));
    audited = new AuditedTransaction(dataSource, new AuditWriter());
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.query(`DELETE FROM "roles" WHERE "role_code" LIKE 'RH05_E2E_%'`);
      await dataSource.destroy();
    }
  });

  it('boots one constrained singleton and changes user-role deletion from CASCADE to RESTRICT', async () => {
    const rows = (await dataSource.query(`
      SELECT v."id", v."version"::text AS "Version",
             pg_get_constraintdef(c.oid) AS "DeleteRule"
      FROM "role_catalog_versions" v
      JOIN pg_constraint c ON c.conname = 'FK_user_roles_role_id_roles_id'
    `)) as Array<{ id: number; Version: string; DeleteRule: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1 });
    expect(rows[0].DeleteRule).toContain('ON DELETE RESTRICT');
    await expect(
      dataSource.query(`INSERT INTO "role_catalog_versions" ("id", "version") VALUES (2, 0)`),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      dataSource.query(`UPDATE "role_catalog_versions" SET "version" = -1 WHERE "id" = 1`),
    ).rejects.toMatchObject({ code: '23514' });

    const protections = (await dataSource.query(`
      SELECT
        EXISTS(
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_exception_cases_assigned_role_id_roles_id' AND confdeltype = 'r'
        ) AS "ExceptionRoleRestrict",
        EXISTS(
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'TRG_data_scopes_role_reference' AND NOT tgisinternal
        ) AS "DataScopeRoleTrigger"
    `)) as Array<{ ExceptionRoleRestrict: boolean; DataScopeRoleTrigger: boolean }>;
    expect(protections[0]).toEqual({ ExceptionRoleRestrict: true, DataScopeRoleTrigger: true });
  });

  it('uses audited writer seams, canonical C order, and rejects a cross-request catalog drift', async () => {
    await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 100 WHERE "id" = 1`);
    const create = new CreateRoleUseCase(roles, audited, catalog);
    const update = new UpdateRoleUseCase(roles, audited, catalog);
    const codec = new RoleCatalogTokenCodec({
      ActiveKid: 'v1',
      Keys: { v1: 'rh05-live-catalog-secret-32-bytes-long' },
    });
    const list = new ListRolesUseCase(roles, catalog, codec);
    const first = await create.Execute({ RoleCode: 'RH05_E2E_ALPHA', RoleName: 'Alpha' });

    const afterCreate = (await dataSource.query(
      `SELECT "version"::text AS "Version" FROM "role_catalog_versions" WHERE "id" = 1`,
    )) as Array<{ Version: string }>;
    expect(afterCreate[0]?.Version).toBe('101');

    const descriptionOnly = await update.Execute({
      Id: first.Id,
      ExpectedUpdatedAt: first.UpdatedAt,
      Description: 'display drift',
    });
    const afterDescription = (await dataSource.query(
      `SELECT "version"::text AS "Version" FROM "role_catalog_versions" WHERE "id" = 1`,
    )) as Array<{ Version: string }>;
    expect(afterDescription[0]?.Version).toBe('101');

    await update.Execute({
      Id: first.Id,
      ExpectedUpdatedAt: descriptionOnly.UpdatedAt,
      RoleName: 'Alpha renamed',
    });
    const firstPage = await list.Execute({ CompleteCatalog: true, Page: 1, PageSize: 1 });
    expect(firstPage.CatalogToken).toEqual(expect.any(String));
    await expect(list.Execute({ CompleteCatalog: true, Page: 1, PageSize: 1 })).resolves.toEqual(firstPage);

    await create.Execute({ RoleCode: 'RH05_E2E_BETA', RoleName: 'Beta' });
    await expect(
      list.Execute({
        CompleteCatalog: true,
        Page: 2,
        PageSize: 1,
        CatalogToken: firstPage.CatalogToken!,
      }),
    ).rejects.toMatchObject({ Details: { Reason: 'CATALOG_TOKEN_MISMATCH' } });

    const snapshot = await catalog.ReadPage(1, 100);
    const codes = snapshot.Items.map((role) => role.RoleCode);
    expect(codes).toEqual([...codes].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))));
    const audits = (await dataSource.query(
      `SELECT "action" FROM "audit_logs" WHERE "object_id" = $1 ORDER BY "occurred_at"`,
      [first.Id],
    )) as Array<{ action: string }>;
    expect(audits).toHaveLength(3);
  });

  it('round-trips catalog versions above 2^53 and atomically resists lost increments', async () => {
    await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 9007199254740993 WHERE "id" = 1`);
    await expect(catalog.ReadPage(1, 100)).resolves.toMatchObject({ Version: '9007199254740993' });

    await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 0 WHERE "id" = 1`);
    await Promise.all(Array.from({ length: 20 }, () => dataSource.transaction((manager) => catalog.Bump(manager))));
    const result = (await dataSource.query(
      `SELECT "version"::text AS "Version" FROM "role_catalog_versions" WHERE "id" = 1`,
    )) as Array<{ Version: string }>;
    expect(result[0]?.Version).toBe('20');
  });

  it('holds a repeatable-read snapshot across a concurrent catalog-version change', async () => {
    await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 70 WHERE "id" = 1`);
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction('REPEATABLE READ');
    try {
      const before = (await runner.query(
        `SELECT "version"::text AS "Version", COUNT(*)::text AS "TotalItems"
           FROM "role_catalog_versions" CROSS JOIN "roles"
          WHERE "role_catalog_versions"."id" = 1
          GROUP BY "role_catalog_versions"."version"`,
      )) as Array<{ Version: string; TotalItems: string }>;
      await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 71 WHERE "id" = 1`);
      const after = (await runner.query(
        `SELECT "version"::text AS "Version", COUNT(*)::text AS "TotalItems"
           FROM "role_catalog_versions" CROSS JOIN "roles"
          WHERE "role_catalog_versions"."id" = 1
          GROUP BY "role_catalog_versions"."version"`,
      )) as Array<{ Version: string; TotalItems: string }>;
      expect(after).toEqual(before);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
      await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 70 WHERE "id" = 1`);
    }
  });

  it('rolls back a qualifying role write when BIGINT is exhausted', async () => {
    await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 9223372036854775807 WHERE "id" = 1`);
    await expect(
      new CreateRoleUseCase(roles, audited, catalog).Execute({ RoleCode: 'RH05_E2E_MAX', RoleName: 'Max rollback' }),
    ).rejects.toBeInstanceOf(CatalogVersionExhaustedException);

    const rows = (await dataSource.query(
      `SELECT 1 FROM "roles" WHERE "role_code" = 'RH05_E2E_MAX'
       UNION ALL
       SELECT 1 FROM "audit_logs" WHERE "object_code" = 'RH05_E2E_MAX'`,
    )) as unknown[];
    expect(rows).toHaveLength(0);
  });

  it('rejects assigned deletion without bump and atomically deletes an unassigned role with one bump', async () => {
    await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 40 WHERE "id" = 1`);
    const assigned = (await dataSource.query(
      `SELECT r."id" FROM "roles" r JOIN "user_roles" ur ON ur."role_id" = r."id" LIMIT 1`,
    )) as Array<{ id: string }>;
    expect(assigned[0]?.id).toBeTruthy();
    await expect(
      dataSource.transaction((manager) => catalog.DeleteUnassigned(assigned[0]!.id, manager)),
    ).rejects.toBeInstanceOf(ConflictException);

    const id = randomUUID();
    await dataSource.query(
      `
      INSERT INTO "roles" ("id", "role_code", "role_name", "description", "is_system", "status",
        "permissions_version", "created_at", "updated_at")
      VALUES ($1, 'RH05_E2E_DELETE', 'Delete me', NULL, false, 'ACTIVE', 0, now(), now())
    `,
      [id],
    );
    const deleted = await new DeleteRoleUseCase(catalog, audited).Execute(id);
    expect(deleted.RoleCode).toBe('RH05_E2E_DELETE');
    const state = (await dataSource.query(
      `
      SELECT "version"::text AS "Version",
             EXISTS(SELECT 1 FROM "roles" WHERE "id" = $1) AS "Exists"
      FROM "role_catalog_versions" WHERE "id" = 1
    `,
      [id],
    )) as Array<{ Version: string; Exists: boolean }>;
    expect(state[0]).toEqual({ Version: '41', Exists: false });
  });

  it('prevents a data-scope soft reference from racing after role deletion', async () => {
    await dataSource.query(`UPDATE "role_catalog_versions" SET "version" = 50 WHERE "id" = 1`);
    const id = randomUUID();
    await dataSource.query(
      `INSERT INTO "roles" ("id", "role_code", "role_name", "description", "is_system", "status",
        "permissions_version", "created_at", "updated_at")
       VALUES ($1, 'RH05_E2E_SCOPE_RACE', 'Scope race', NULL, false, 'ACTIVE', 0, now(), now())`,
      [id],
    );

    let releaseDelete!: () => void;
    let deletedInsideTransaction!: () => void;
    const release = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    const deleted = new Promise<void>((resolve) => {
      deletedInsideTransaction = resolve;
    });
    const deleting = dataSource.transaction(async (manager) => {
      await catalog.DeleteUnassigned(id, manager);
      await catalog.Bump(manager);
      deletedInsideTransaction();
      await release;
    });
    await deleted;

    const inserting = dataSource.query(
      `INSERT INTO "data_scopes"
        ("id", "principal_type", "principal_id", "scope_type", "scope_value_id", "scope_value_code",
         "include_all", "created_at", "updated_at")
       VALUES ($1, 'ROLE', $2, 'WAREHOUSE', NULL, NULL, true, now(), now())`,
      [randomUUID(), id],
    );
    const rejectedInsert = expect(inserting).rejects.toMatchObject({ code: '23503' });
    releaseDelete();
    await deleting;
    await rejectedInsert;

    const references = (await dataSource.query(
      `SELECT 1 FROM "data_scopes" WHERE "principal_type" = 'ROLE' AND "principal_id" = $1`,
      [id],
    )) as unknown[];
    expect(references).toHaveLength(0);
  });
});
