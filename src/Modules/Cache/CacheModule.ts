import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_SERVICE, ICacheService } from './Domain/Interfaces/ICacheService';
import { InMemoryCacheService } from './Infrastructure/InMemoryCacheService';
import { RedisCacheService } from './Infrastructure/RedisCacheService';
import { CacheFacade } from './Application/CacheFacade';

@Module({
  providers: [
    {
      provide: CACHE_SERVICE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('Redis.Url');
        if (url && url.trim().length > 0) {
          return new RedisCacheService(configService);
        }
        return new InMemoryCacheService();
      },
    },
    {
      provide: CacheFacade,
      useFactory: (cache: ICacheService) => new CacheFacade(cache),
      inject: [CACHE_SERVICE],
    },
  ],
  exports: [CACHE_SERVICE, CacheFacade],
})
export class CacheModule {}
