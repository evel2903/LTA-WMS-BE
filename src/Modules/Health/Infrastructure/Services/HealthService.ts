import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { HealthCheckResult, IHealthService, ReadyReport } from '@modules/Health/Application/Interfaces/IHealthService';

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
