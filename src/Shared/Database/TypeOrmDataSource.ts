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
import { ControlExceptionCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ControlExceptionCatalogOrmEntity';
import { ValidationRuleCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ValidationRuleCatalogOrmEntity';
import { ExceptionCaseOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ExceptionCaseOrmEntity';
import { PartnerOrmEntity } from '@modules/PartnerMaster/Infrastructure/Persistence/Entities/PartnerOrmEntity';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';
import { MobileScanEventOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileScanEventOrmEntity';
import { LabelTemplateOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateOrmEntity';
import { LabelTemplateVersionOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateVersionOrmEntity';
import { PrintJobOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/PrintJobOrmEntity';
import { ReprintRequestOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/ReprintRequestOrmEntity';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';
import { InboundDiscrepancyOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundDiscrepancyOrmEntity';
import { InboundLpnOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundLpnOrmEntity';
import { InboundPutawayReleaseOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPutawayReleaseOrmEntity';
import { QcResultOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcResultOrmEntity';
import { QcTaskOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcTaskOrmEntity';
import { ReceiptOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptOrmEntity';
import { ReceiptLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptLineOrmEntity';
import { ReceivingSessionOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceivingSessionOrmEntity';
import { PutawayTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/PutawayTaskOrmEntity';

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
    ControlExceptionCatalogOrmEntity,
    ValidationRuleCatalogOrmEntity,
    ExceptionCaseOrmEntity,
    PartnerOrmEntity,
    CoreFlowInstanceOrmEntity,
    WorkflowMilestoneOrmEntity,
    WorkflowHandoffOrmEntity,
    ImportBatchOrmEntity,
    InterfaceMessageOrmEntity,
    OutboxMessageOrmEntity,
    MobileTaskOrmEntity,
    MobileScanEventOrmEntity,
    LabelTemplateOrmEntity,
    LabelTemplateVersionOrmEntity,
    PrintJobOrmEntity,
    ReprintRequestOrmEntity,
    InboundPlanOrmEntity,
    InboundPlanLineOrmEntity,
    InboundDiscrepancyOrmEntity,
    InboundLpnOrmEntity,
    InboundPutawayReleaseOrmEntity,
    QcTaskOrmEntity,
    QcResultOrmEntity,
    ReceivingSessionOrmEntity,
    ReceiptOrmEntity,
    ReceiptLineOrmEntity,
    PutawayTaskOrmEntity,
  ],
  migrations: [__dirname + '/Migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: env.NodeEnv !== 'production',
});
