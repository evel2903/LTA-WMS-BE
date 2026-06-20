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
import { PackDefinitionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/PackDefinitionOrmEntity';
import { UomConversionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomConversionOrmEntity';
import { SkuBarcodeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuBarcodeOrmEntity';
import { ItemCoverageOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ItemCoverageOrmEntity';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { MasterDataOwnershipPolicyOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/MasterDataOwnershipPolicyOrmEntity';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';
import { OverrideLogOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/OverrideLogOrmEntity';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';
import { GroupOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/GroupOrmEntity';
import { GroupMemberOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/GroupMemberOrmEntity';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { ApprovalRequestOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ApprovalRequestOrmEntity';

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
    PackDefinitionOrmEntity,
    UomConversionOrmEntity,
    SkuBarcodeOrmEntity,
    ItemCoverageOrmEntity,
    InventoryStatusOrmEntity,
    InventoryDimensionOrmEntity,
    InventoryBalanceOrmEntity,
    MasterDataOwnershipPolicyOrmEntity,
    WarehouseProfileOrmEntity,
    WarehouseProfileAssignmentOrmEntity,
    RuleGroupOrmEntity,
    RuleDefinitionOrmEntity,
    WarehouseProfileRuleOrmEntity,
    OverrideLogOrmEntity,
    RoleOrmEntity,
    PermissionOrmEntity,
    RolePermissionOrmEntity,
    UserRoleOrmEntity,
    GroupOrmEntity,
    GroupMemberOrmEntity,
    DataScopeOrmEntity,
    ReasonCodeOrmEntity,
    AuditLogOrmEntity,
    ApprovalRequestOrmEntity,
  ],
  migrations: [__dirname + '/Migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: env.NodeEnv !== 'production',
});
