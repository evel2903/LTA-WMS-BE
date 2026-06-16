import { Injectable } from '@nestjs/common';
import { ICacheService } from '../Domain/Interfaces/ICacheService';

type CacheItem = { Value: string; ExpiresAt?: number };

@Injectable()
export class InMemoryCacheService implements ICacheService {
  private readonly store = new Map<string, CacheItem>();

  public async Get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.ExpiresAt !== undefined && item.ExpiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.Value;
  }

  public async Set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = typeof ttlSeconds === 'number' && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { Value: value, ExpiresAt: expiresAt });
  }

  public async Delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
