import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICacheService } from '../Domain/Interfaces/ICacheService';

@Injectable()
export class RedisCacheService implements ICacheService, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('Redis.Url');
    this.prefix = configService.get<string>('Redis.KeyPrefix') ?? 'appseed:';
    this.redis = new Redis(url ?? 'redis://localhost:6379', { lazyConnect: true });
  }

  public async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      // ignore
    }
  }

  public async Get(key: string): Promise<string | null> {
    await this.redis.connect().catch(() => undefined);
    return await this.redis.get(this.prefix + key);
  }

  public async Set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.redis.connect().catch(() => undefined);
    if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
      await this.redis.set(this.prefix + key, value, 'EX', ttlSeconds);
      return;
    }
    await this.redis.set(this.prefix + key, value);
  }

  public async Delete(key: string): Promise<void> {
    await this.redis.connect().catch(() => undefined);
    await this.redis.del(this.prefix + key);
  }
}
