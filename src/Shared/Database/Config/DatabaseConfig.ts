import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { ConfigService } from '@nestjs/config';
import type { DatabaseConfigValues } from '@shared/Config/AppConfig';
import { SnakeNamingStrategy } from '@shared/Database/SnakeNamingStrategy';

export const CreateDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const db = configService.get<DatabaseConfigValues>('Database', { infer: true });
  const nodeEnv = configService.get<string>('App.NodeEnv') ?? 'development';

  return {
    type: 'postgres',
    host: db?.Host,
    port: db?.Port,
    username: db?.Username,
    password: db?.Password,
    database: db?.Database,
    namingStrategy: new SnakeNamingStrategy(),
    autoLoadEntities: true,
    synchronize: nodeEnv !== 'production',
    logging: nodeEnv !== 'production',
  };
};
