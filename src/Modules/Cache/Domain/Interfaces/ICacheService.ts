export const CACHE_SERVICE = Symbol('ICacheService');

export interface ICacheService {
  Get(key: string): Promise<string | null>;
  Set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  Delete(key: string): Promise<void>;
}
