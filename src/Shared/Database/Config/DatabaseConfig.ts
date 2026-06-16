import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { ConfigService } from '@nestjs/config';
import type { DatabaseConfigValues } from '../../Config/AppConfig';

export const CreateDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const db = configService.get<DatabaseConfigValues>('Database', { infer: true });
  const nodeEnv = configService.get<string>('App.NodeEnv') ?? 'development';

  return {
    type: 'mysql',
    host: db?.Host,
    port: db?.Port,
    username: db?.Username,
    password: db?.Password,
    database: db?.Database,
    autoLoadEntities: true,
    synchronize: nodeEnv !== 'production',
    logging: nodeEnv !== 'production',
  };
};
