import 'dotenv/config';
import { DataSource } from 'typeorm';
import { GetEnv } from '@shared/Config/Env/Env';
import { SnakeNamingStrategy } from '@shared/Database/SnakeNamingStrategy';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { RefreshTokenOrmEntity } from '@modules/Authentication/Infrastructure/Persistence/Entities/RefreshTokenOrmEntity';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';

const env = GetEnv();

export default new DataSource({
  type: 'postgres',
  host: env.DbHost,
  port: env.DbPort,
  username: env.DbUsername,
  password: env.DbPassword,
  database: env.DbDatabase,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [
    UserOrmEntity,
    RefreshTokenOrmEntity,
    SiteOrmEntity,
    WarehouseOrmEntity,
    ZoneOrmEntity,
    LocationProfileOrmEntity,
    LocationOrmEntity,
    OwnerOrmEntity,
    UomOrmEntity,
    SkuOrmEntity,
  ],
  migrations: [__dirname + '/Migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: env.NodeEnv !== 'production',
});
