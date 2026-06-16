import 'dotenv/config';
import { DataSource } from 'typeorm';
import { GetEnv } from '../Config/Env/Env';
import { UserOrmEntity } from '../../Modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';

const env = GetEnv();

export default new DataSource({
  type: 'mysql',
  host: env.DbHost,
  port: env.DbPort,
  username: env.DbUsername,
  password: env.DbPassword,
  database: env.DbDatabase,
  entities: [UserOrmEntity],
  migrations: [__dirname + '/Migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: env.NodeEnv !== 'production',
});
