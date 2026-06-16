import { ICacheService } from '../Domain/Interfaces/ICacheService';

export class CacheFacade {
  constructor(private readonly cacheService: ICacheService) {}

  public async GetString(key: string): Promise<string | null> {
    return await this.cacheService.Get(key);
  }

  public async SetString(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.cacheService.Set(key, value, ttlSeconds);
  }

  public async Delete(key: string): Promise<void> {
    await this.cacheService.Delete(key);
  }
}
