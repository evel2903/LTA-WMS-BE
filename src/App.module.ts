import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValidateProcessEnv } from '@shared/Config/Env/Env';
import { ConfigService } from '@nestjs/config';
import { AppConfig, DatabaseAppConfig, EmailAppConfig, JwtAppConfig, RedisAppConfig } from '@shared/Config/AppConfig';
import { CreateDatabaseConfig } from '@shared/Database/Config/DatabaseConfig';
import { AppController } from '@app/AppController';
import { UserModule } from '@modules/Users/UserModule';
import { AuthenticationModule } from '@modules/Authentication/AuthenticationModule';
import { CommonModule } from '@common/CommonModule';
import { ThrottlerModule } from '@nestjs/throttler';
import { FileUploadModule } from '@modules/FileUpload/FileUploadModule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@modules/Cache/CacheModule';
import { EmailModule } from '@modules/Email/EmailModule';
import { HealthModule } from '@modules/Health/HealthModule';
import { JobsModule } from '@modules/Jobs/JobsModule';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';

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
    MasterDataModule,
    WarehouseProfileModule,
    AccessControlModule,
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
