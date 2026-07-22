import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { HealthCheckResult, IHealthService, ReadyReport } from '@modules/Health/Application/Interfaces/IHealthService';
import { RoleCatalogConfigValues } from '@shared/Config/AppConfig';

@Injectable()
export class HealthService implements IHealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  public async Live(): Promise<{ Status: 'OK' }> {
    return { Status: 'OK' };
  }

  public async Ready(): Promise<ReadyReport> {
    const checks: Record<string, () => Promise<HealthCheckResult>> = {
      postgres: async () => {
        try {
          await this.dataSource.query('SELECT 1');
          return { Status: 'up' };
        } catch (error) {
          return { Status: 'down', Details: String((error as Error)?.message ?? error) };
        }
      },
      role_catalog: async () => {
        const signing = this.configService.get<RoleCatalogConfigValues>('RoleCatalog');
        const activeSecret = signing?.Keys?.[signing.ActiveKid ?? ''];
        if (
          signing?.Valid === false ||
          !signing?.ActiveKid ||
          !activeSecret ||
          Buffer.byteLength(activeSecret, 'utf8') < 32
        ) {
          return { Status: 'down', Details: 'role catalog signing configuration unavailable' };
        }
        try {
          const rows = (await this.dataSource.query(
            `SELECT "id" AS "Id", "version"::text AS "Version" FROM "role_catalog_versions"`,
          )) as Array<{ Id: number; Version: string }>;
          if (rows.length !== 1 || rows[0]?.Id !== 1 || !/^(0|[1-9][0-9]*)$/.test(rows[0]?.Version ?? '')) {
            return { Status: 'down', Details: 'role catalog singleton missing or corrupt' };
          }
          const constraints = (await this.dataSource.query(
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
            return { Status: 'down', Details: 'role catalog singleton schema is corrupt' };
          }
          return { Status: 'up', Details: { Version: rows[0].Version } };
        } catch (error) {
          return { Status: 'down', Details: String((error as Error)?.message ?? error) };
        }
      },
      memory_heap: async () => {
        const limit = this.ResolveMemoryHeapLimit();
        const used = process.memoryUsage().heapUsed;
        return used <= limit
          ? { Status: 'up', Details: { Used: used, Limit: limit } }
          : { Status: 'down', Details: { Used: used, Limit: limit } };
      },
      redis: async () => {
        const url = this.configService.get<string>('Redis.Url');
        if (!url) return { Status: 'skipped' };
        const redis = new Redis(url, { lazyConnect: true });
        try {
          await redis.connect();
          await redis.ping();
          return { Status: 'up' };
        } catch (error) {
          return { Status: 'down', Details: String((error as Error)?.message ?? error) };
        } finally {
          try {
            await redis.quit();
          } catch {
            // ignore
          }
        }
      },
    };

    const details: Record<string, HealthCheckResult> = {};
    const info: Record<string, HealthCheckResult> = {};
    const error: Record<string, HealthCheckResult> = {};

    for (const key of Object.keys(checks)) {
      const result = await checks[key]();
      details[key] = result;
      if (result.Status === 'up' || result.Status === 'skipped') info[key] = result;
      if (result.Status === 'down') error[key] = result;
    }

    const status: ReadyReport['Status'] = Object.keys(error).length > 0 ? 'error' : 'ok';
    return { Status: status, Info: info, Error: error, Details: details };
  }

  private ResolveMemoryHeapLimit(): number {
    const configuredBytes = this.ParsePositiveNumber(
      this.configService.get<string | number>('HEALTH_MEMORY_HEAP_LIMIT_BYTES'),
    );
    if (configuredBytes) return configuredBytes;

    const configuredMb = this.ParsePositiveNumber(
      this.configService.get<string | number>('HEALTH_MEMORY_HEAP_LIMIT_MB'),
    );
    if (configuredMb) return configuredMb * 1024 * 1024;

    return 768 * 1024 * 1024;
  }

  private ParsePositiveNumber(raw: string | number | undefined): number | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
