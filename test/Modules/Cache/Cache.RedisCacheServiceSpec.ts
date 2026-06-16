import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisCacheService } from '../../../src/Modules/Cache/Infrastructure/RedisCacheService';

type RedisInstance = {
  connect: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (...args: unknown[]) => Promise<unknown>;
  del: (key: string) => Promise<number>;
  quit: () => Promise<void>;
};

const instances: RedisInstance[] = [];

jest.mock('ioredis', () => {
  const Ctor = jest.fn().mockImplementation(() => {
    const instance: RedisInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    instances.push(instance);
    return instance;
  });

  return { __esModule: true, default: Ctor };
});

describe('RedisCacheService', () => {
  beforeEach(() => {
    instances.splice(0, instances.length);
  });

  it('prefixes keys and delegates calls to ioredis', async () => {
    const configService = {
      get: (key: string) => {
        if (key === 'Redis.Url') return 'redis://example:6379';
        if (key === 'Redis.KeyPrefix') return 'pfx:';
        return undefined;
      },
    } as unknown as ConfigService;

    const cache = new RedisCacheService(configService);
    expect(instances).toHaveLength(1);
    const redis = instances[0];

    await cache.Set('k', 'v', 5);
    await cache.Get('k');
    await cache.Delete('k');
    await cache.onModuleDestroy();

    expect(redis.connect).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith('pfx:k', 'v', 'EX', 5);
    expect(redis.get).toHaveBeenCalledWith('pfx:k');
    expect(redis.del).toHaveBeenCalledWith('pfx:k');
    expect(redis.quit).toHaveBeenCalled();

    // also validate the constructor was called with url
    const RedisCtor = Redis as unknown as { mock: { calls: unknown[][] } };
    expect(RedisCtor.mock.calls[0][0]).toBe('redis://example:6379');
  });
});
