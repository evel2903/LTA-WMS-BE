import 'dotenv/config';
import { DataSource } from 'typeorm';
import { GetEnv } from '@shared/Config/Env/Env';
import { SnakeNamingStrategy } from '@shared/Database/SnakeNamingStrategy';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { RefreshTokenOrmEntity } from '@modules/Authentication/Infrastructure/Persistence/Entities/RefreshTokenOrmEntity';

const env = GetEnv();

export default new DataSource({
  type: 'postgres',
  host: env.DbHost,
  port: env.DbPort,
  username: env.DbUsername,
  password: env.DbPassword,
  database: env.DbDatabase,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [UserOrmEntity, RefreshTokenOrmEntity],
  migrations: [__dirname + '/Migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: env.NodeEnv !== 'production',
});
