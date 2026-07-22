import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  CatalogMetadataRangeException,
  CatalogVersionExhaustedException,
  CatalogVersionUnavailableException,
  ConflictException,
} from '@common/Exceptions/AppException';
import {
  IRoleCatalogRepository,
  RoleCatalogSnapshot,
} from '@modules/AccessControl/Application/Interfaces/IRoleCatalogRepository';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { RoleOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/RoleOrmMapper';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';

const MAX_BIGINT = '9223372036854775807';
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const ROLE_CATALOG_ADVISORY_LOCK = 14705;

@Injectable()
export class RoleCatalogRepository implements IRoleCatalogRepository {
  private readonly logger = new Logger(RoleCatalogRepository.name);

  constructor(private readonly dataSource: DataSource) {}

  public async ReadPage(page: number, pageSize: number): Promise<RoleCatalogSnapshot> {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const version = await this.ReadVersion(manager);
      const countRows = (await manager.query(`SELECT COUNT(*)::text AS "TotalItems" FROM "roles"`)) as Array<{
        TotalItems: string;
      }>;
      const rawTotal = countRows[0]?.TotalItems;
      if (!rawTotal || !DECIMAL.test(rawTotal)) throw new CatalogVersionUnavailableException();
      const totalItems = Number(rawTotal);
      if (!Number.isSafeInteger(totalItems)) throw new CatalogMetadataRangeException();

      const items = await manager
        .getRepository(RoleOrmEntity)
        .createQueryBuilder('role')
        .orderBy('role.role_code COLLATE "C"', 'ASC')
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .getMany();

      return {
        Version: version,
        Items: items.map(RoleOrmMapper.ToDomain),
        TotalItems: totalItems,
      };
    });
  }

  public async Bump(manager: EntityManager): Promise<string> {
    await this.AssertSingletonSchema(manager);
    const rows = this.QueryRows<{ Version: string }>(
      await manager.query(
        `UPDATE "role_catalog_versions"
         SET "version" = "version" + 1
       WHERE "id" = 1 AND "version" < $1::bigint
       RETURNING "version"::text AS "Version"`,
        [MAX_BIGINT],
      ),
    );
    if (rows[0]?.Version) return rows[0].Version;

    const current = (await manager.query(
      `SELECT "version"::text AS "Version" FROM "role_catalog_versions" WHERE "id" = 1`,
    )) as Array<{ Version: string }>;
    if (current[0]?.Version === MAX_BIGINT) {
      this.logger.error('Role catalog version exhausted; qualifying role transaction will roll back');
      throw new CatalogVersionExhaustedException();
    }
    throw new CatalogVersionUnavailableException();
  }

  public async CreateIfAbsentAndBump(role: RoleEntity): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [ROLE_CATALOG_ADVISORY_LOCK]);
      const insert = await manager
        .getRepository(RoleOrmEntity)
        .createQueryBuilder()
        .insert()
        .values(RoleOrmMapper.ToOrm(role))
        .orIgnore()
        .returning('id')
        .execute();
      const insertedRows = this.QueryRows<{ id: string }>(insert.raw);
      if (insertedRows.length === 0) return false;
      await this.Bump(manager);
      return true;
    });
  }

  public async DeleteUnassigned(roleId: string, manager: EntityManager): Promise<RoleEntity | null> {
    const repo = manager.getRepository(RoleOrmEntity);
    const locked = await repo.findOne({ where: { Id: roleId }, lock: { mode: 'pessimistic_write' } });
    if (!locked) return null;

    const references = (await manager.query(
      `SELECT
         EXISTS(SELECT 1 FROM "user_roles" WHERE "role_id" = $1) OR
         EXISTS(SELECT 1 FROM "data_scopes" WHERE "principal_type" = 'ROLE' AND "principal_id" = $1) OR
         EXISTS(SELECT 1 FROM "exception_cases" WHERE "assigned_role_id" = $1) AS "Referenced"`,
      [roleId],
    )) as Array<{ Referenced: boolean }>;
    if (references[0]?.Referenced) {
      throw new ConflictException('Role is assigned and cannot be deleted', { Reason: 'ROLE_ASSIGNED' });
    }

    try {
      await repo.delete(roleId);
    } catch (error) {
      if ((error as { code?: string }).code === '23503') {
        throw new ConflictException('Role is assigned and cannot be deleted', { Reason: 'ROLE_ASSIGNED' });
      }
      throw error;
    }
    return RoleOrmMapper.ToDomain(locked);
  }

  private async ReadVersion(manager: EntityManager): Promise<string> {
    await this.AssertSingletonSchema(manager);
    const rows = (await manager.query(
      `SELECT "id" AS "Id", "version"::text AS "Version" FROM "role_catalog_versions"`,
    )) as Array<{ Id: number; Version: string }>;
    const version = rows[0]?.Version;
    if (!version || !DECIMAL.test(version) || rows.length !== 1 || rows[0]?.Id !== 1) {
      throw new CatalogVersionUnavailableException();
    }
    return version;
  }

  private async AssertSingletonSchema(manager: EntityManager): Promise<void> {
    const constraints = (await manager.query(
      `SELECT "conname" AS "Name", pg_get_constraintdef("oid") AS "Definition"
         FROM pg_constraint
        WHERE "conrelid" = 'role_catalog_versions'::regclass
          AND "conname" IN (
            'PK_role_catalog_versions',
            'CHK_role_catalog_versions_singleton',
            'CHK_role_catalog_versions_nonnegative'
          )`,
    )) as Array<{ Name: string; Definition: string }>;
    const definitions = new Map(
      (Array.isArray(constraints) ? constraints : []).map((row) => [
        row.Name,
        String(row.Definition).toLowerCase().replace(/\s+/g, ''),
      ]),
    );
    if (
      definitions.get('PK_role_catalog_versions') !== 'primarykey(id)' ||
      definitions.get('CHK_role_catalog_versions_singleton') !== 'check((id=1))' ||
      definitions.get('CHK_role_catalog_versions_nonnegative') !== 'check((version>=0))'
    ) {
      throw new CatalogVersionUnavailableException('Role catalog singleton schema is corrupt');
    }
  }

  private QueryRows<T>(result: unknown): T[] {
    if (!Array.isArray(result)) return [];
    return Array.isArray(result[0]) ? (result[0] as T[]) : (result as T[]);
  }
}
