import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValidateProcessEnv } from './Shared/Config/Env/Env';
import { ConfigService } from '@nestjs/config';
import { AppConfig, DatabaseAppConfig, EmailAppConfig, JwtAppConfig, RedisAppConfig } from './Shared/Config/AppConfig';
import { CreateDatabaseConfig } from './Shared/Database/Config/DatabaseConfig';
import { AppController } from './AppController';
import { UserModule } from './Modules/Users/UserModule';
import { AuthenticationModule } from './Modules/Authentication/AuthenticationModule';
import { CommonModule } from './Common/CommonModule';
import { ThrottlerModule } from '@nestjs/throttler';
import { FileUploadModule } from './Modules/FileUpload/FileUploadModule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from './Modules/Cache/CacheModule';
import { EmailModule } from './Modules/Email/EmailModule';
import { HealthModule } from './Modules/Health/HealthModule';
import { JobsModule } from './Modules/Jobs/JobsModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: ValidateProcessEnv,
      load: [AppConfig, DatabaseAppConfig, JwtAppConfig, RedisAppConfig, EmailAppConfig],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttlMs = configService.get<number>('THROTTLE_TTL_MS');
        const limit = configService.get<number>('THROTTLE_LIMIT');

        return [
          {
            ttl: typeof ttlMs === 'number' ? Math.floor(ttlMs / 1000) : 60,
            limit: typeof limit === 'number' ? limit : 60,
          },
        ];
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => CreateDatabaseConfig(configService),
    }),
    CommonModule,
    UserModule,
    AuthenticationModule,
    FileUploadModule,
    CacheModule,
    EmailModule,
    HealthModule,
    JobsModule.Register(),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
