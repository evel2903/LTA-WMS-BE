import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  CONTROL_EXCEPTION_CATALOG,
  IControlExceptionCatalog,
} from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import {
  EXCEPTION_CASE_REPOSITORY,
  IExceptionCaseRepository,
} from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  CORE_FLOW_REPOSITORY,
  ICoreFlowRepository,
} from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowModule } from '@modules/CoreFlow/CoreFlowModule';
import {
  INTEGRATION_REPOSITORY,
  IIntegrationRepository,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationModule } from '@modules/Integration/IntegrationModule';
import { BarcodeLabelModule } from '@modules/BarcodeLabel/BarcodeLabelModule';
import { ValidateLabelBlockingUseCase } from '@modules/BarcodeLabel/Application/UseCases/ValidateLabelBlockingUseCase';
import { SpreadsheetModule } from '@modules/Spreadsheet/SpreadsheetModule';
import {
  ISpreadsheetService,
  SPREADSHEET_SERVICE,
} from '@modules/Spreadsheet/Application/Interfaces/ISpreadsheetService';
import { CancelInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CancelInboundPlanUseCase';
import { ConfirmInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundPlanUseCase';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { ImportInboundPlanLinesUseCase } from '@modules/Inbound/Application/UseCases/ImportInboundPlanLinesUseCase';
import { UpdateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/UpdateInboundPlanUseCase';
import {
  ISkuCodeBatchLookup,
  IUomCodeBatchLookup,
} from '@modules/Inbound/Application/Interfaces/IMasterDataCodeLookup';
import { CaptureInboundDiscrepancyUseCase } from '@modules/Inbound/Application/UseCases/CaptureInboundDiscrepancyUseCase';
import { ConfirmInboundLpnUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundLpnUseCase';
import { ConfirmReceiptLineUseCase } from '@modules/Inbound/Application/UseCases/ConfirmReceiptLineUseCase';
import { EvaluateQcTaskUseCase } from '@modules/Inbound/Application/UseCases/EvaluateQcTaskUseCase';
import { GetInboundOperationalStateUseCase } from '@modules/Inbound/Application/UseCases/GetInboundOperationalStateUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { RecordQcResultUseCase } from '@modules/Inbound/Application/UseCases/RecordQcResultUseCase';
import { ReleaseInboundToPutawayUseCase } from '@modules/Inbound/Application/UseCases/ReleaseInboundToPutawayUseCase';
import { StartReceivingSessionUseCase } from '@modules/Inbound/Application/UseCases/StartReceivingSessionUseCase';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import {
  IInboundPlanRepository,
  INBOUND_PLAN_REPOSITORY,
} from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import {
  IReceivingRepository,
  RECEIVING_REPOSITORY,
} from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
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
import { InboundPlanRepository } from '@modules/Inbound/Infrastructure/Persistence/Repositories/InboundPlanRepository';
import { ReceivingRepository } from '@modules/Inbound/Infrastructure/Persistence/Repositories/ReceivingRepository';
import { InboundPlanController } from '@modules/Inbound/Presentation/Controllers/InboundPlanController';
import { QcTaskController } from '@modules/Inbound/Presentation/Controllers/QcTaskController';
import { ReceiptController } from '@modules/Inbound/Presentation/Controllers/ReceiptController';
import {
  IInventoryBalanceRepository,
  INVENTORY_BALANCE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import {
  IInventoryDimensionRepository,
  INVENTORY_DIMENSION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import {
  IInventoryStatusRepository,
  INVENTORY_STATUS_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import {
  ILocationRepository,
  LOCATION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IOwnerRepository, OWNER_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository, SKU_REPOSITORY } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository, UOM_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import {
  IWarehouseRepository,
  WAREHOUSE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import {
  IPartnerRepository,
  PARTNER_REPOSITORY,
} from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerMasterModule } from '@modules/PartnerMaster/PartnerMasterModule';
import {
  IWarehouseProfileRepository,
  WAREHOUSE_PROFILE_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IRuleResolver, RULE_RESOLVER } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import { InboundRuleGate } from '@modules/Inbound/Application/Services/InboundRuleGate';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InboundPlanOrmEntity,
      InboundPlanLineOrmEntity,
      ReceivingSessionOrmEntity,
      ReceiptOrmEntity,
      ReceiptLineOrmEntity,
      InboundDiscrepancyOrmEntity,
      InboundLpnOrmEntity,
      InboundPutawayReleaseOrmEntity,
      QcTaskOrmEntity,
      QcResultOrmEntity,
    ]),
    AccessControlModule,
    MasterDataModule,
    PartnerMasterModule,
    CoreFlowModule,
    IntegrationModule,
    BarcodeLabelModule,
    WarehouseProfileModule,
    SpreadsheetModule,
  ],
  controllers: [InboundPlanController, ReceiptController, QcTaskController],
  providers: [
    { provide: INBOUND_PLAN_REPOSITORY, useClass: InboundPlanRepository },
    { provide: RECEIVING_REPOSITORY, useClass: ReceivingRepository },
    {
      provide: InboundRuleGate,
      useFactory: (resolver: IRuleResolver, warehouses: IWarehouseRepository) =>
        new InboundRuleGate(resolver, warehouses),
      inject: [RULE_RESOLVER, WAREHOUSE_REPOSITORY],
    },
    {
      provide: CreateInboundPlanUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        partners: IPartnerRepository,
        owners: IOwnerRepository,
        warehouses: IWarehouseRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        profiles: IWarehouseProfileRepository,
        audited: AuditedTransaction,
      ) => new CreateInboundPlanUseCase(inboundPlans, partners, owners, warehouses, skus, uoms, profiles, audited),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        PARTNER_REPOSITORY,
        OWNER_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        AuditedTransaction,
      ],
    },
    {
      provide: UpdateInboundPlanUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        partners: IPartnerRepository,
        owners: IOwnerRepository,
        warehouses: IWarehouseRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        profiles: IWarehouseProfileRepository,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new UpdateInboundPlanUseCase(
          inboundPlans,
          partners,
          owners,
          warehouses,
          skus,
          uoms,
          profiles,
          audited,
          permissionChecker,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        PARTNER_REPOSITORY,
        OWNER_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ConfirmInboundPlanUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new ConfirmInboundPlanUseCase(inboundPlans, coreFlows, integrations, audited, permissionChecker),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: CancelInboundPlanUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new CancelInboundPlanUseCase(inboundPlans, audited, permissionChecker),
      inject: [INBOUND_PLAN_REPOSITORY, AuditedTransaction, PERMISSION_CHECKER],
    },
    {
      provide: ImportInboundPlanLinesUseCase,
      useFactory: (
        spreadsheet: ISpreadsheetService,
        skus: ISkuCodeBatchLookup,
        uoms: IUomCodeBatchLookup,
        createInboundPlan: CreateInboundPlanUseCase,
      ) => new ImportInboundPlanLinesUseCase(spreadsheet, skus, uoms, createInboundPlan),
      inject: [SPREADSHEET_SERVICE, SKU_REPOSITORY, UOM_REPOSITORY, CreateInboundPlanUseCase],
    },
    {
      provide: GetInboundPlanUseCase,
      useFactory: (inboundPlans: IInboundPlanRepository, permissionChecker: IPermissionChecker) =>
        new GetInboundPlanUseCase(inboundPlans, permissionChecker),
      inject: [INBOUND_PLAN_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: GetInboundOperationalStateUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        permissionChecker: IPermissionChecker,
      ) => new GetInboundOperationalStateUseCase(inboundPlans, receiving, permissionChecker),
      inject: [INBOUND_PLAN_REPOSITORY, RECEIVING_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: ListInboundPlansUseCase,
      useFactory: (inboundPlans: IInboundPlanRepository, permissionChecker: IPermissionChecker) =>
        new ListInboundPlansUseCase(inboundPlans, permissionChecker),
      inject: [INBOUND_PLAN_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: RecordGateInUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        coreFlows: ICoreFlowRepository,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new RecordGateInUseCase(inboundPlans, coreFlows, audited, permissionChecker),
      inject: [INBOUND_PLAN_REPOSITORY, CORE_FLOW_REPOSITORY, AuditedTransaction, PERMISSION_CHECKER],
    },
    {
      provide: ValidateReceivingReadinessUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        profiles: IWarehouseProfileRepository,
        ruleGate: InboundRuleGate,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new ValidateReceivingReadinessUseCase(
          inboundPlans,
          profiles,
          ruleGate,
          reasonCatalog,
          audited,
          permissionChecker,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        InboundRuleGate,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: StartReceivingSessionUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        readiness: ValidateReceivingReadinessUseCase,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new StartReceivingSessionUseCase(inboundPlans, receiving, readiness, audited, permissionChecker),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        RECEIVING_REPOSITORY,
        ValidateReceivingReadinessUseCase,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ConfirmReceiptLineUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        readiness: ValidateReceivingReadinessUseCase,
        skus: ISkuRepository,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new ConfirmReceiptLineUseCase(
          inboundPlans,
          receiving,
          coreFlows,
          integrations,
          reasonCatalog,
          readiness,
          skus,
          audited,
          permissionChecker,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        RECEIVING_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        ValidateReceivingReadinessUseCase,
        SKU_REPOSITORY,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: CaptureInboundDiscrepancyUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        exceptionCases: IExceptionCaseRepository,
        controlExceptionCatalog: IControlExceptionCatalog,
        profiles: IWarehouseProfileRepository,
        ruleGate: InboundRuleGate,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new CaptureInboundDiscrepancyUseCase(
          inboundPlans,
          receiving,
          exceptionCases,
          controlExceptionCatalog,
          profiles,
          ruleGate,
          coreFlows,
          integrations,
          reasonCatalog,
          audited,
          permissionChecker,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        RECEIVING_REPOSITORY,
        EXCEPTION_CASE_REPOSITORY,
        CONTROL_EXCEPTION_CATALOG,
        WAREHOUSE_PROFILE_REPOSITORY,
        InboundRuleGate,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ConfirmInboundLpnUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new ConfirmInboundLpnUseCase(inboundPlans, receiving, reasonCatalog, audited, permissionChecker),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        RECEIVING_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: EvaluateQcTaskUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        profiles: IWarehouseProfileRepository,
        ruleGate: InboundRuleGate,
        partners: IPartnerRepository,
        skus: ISkuRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new EvaluateQcTaskUseCase(
          inboundPlans,
          receiving,
          profiles,
          ruleGate,
          partners,
          skus,
          coreFlows,
          integrations,
          reasonCatalog,
          audited,
          permissionChecker,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        RECEIVING_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        InboundRuleGate,
        PARTNER_REPOSITORY,
        SKU_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ReleaseInboundToPutawayUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        profiles: IWarehouseProfileRepository,
        ruleGate: InboundRuleGate,
        labelBlocking: ValidateLabelBlockingUseCase,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        skus: ISkuRepository,
        locations: ILocationRepository,
        inventoryDimensions: IInventoryDimensionRepository,
        inventoryBalances: IInventoryBalanceRepository,
        inventoryStatuses: IInventoryStatusRepository,
        dimensionKeyService: InventoryDimensionKeyService,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new ReleaseInboundToPutawayUseCase(
          inboundPlans,
          receiving,
          profiles,
          ruleGate,
          labelBlocking,
          coreFlows,
          integrations,
          reasonCatalog,
          skus,
          locations,
          inventoryDimensions,
          inventoryBalances,
          inventoryStatuses,
          dimensionKeyService,
          audited,
          permissionChecker,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        RECEIVING_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        InboundRuleGate,
        ValidateLabelBlockingUseCase,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        SKU_REPOSITORY,
        LOCATION_REPOSITORY,
        INVENTORY_DIMENSION_REPOSITORY,
        INVENTORY_BALANCE_REPOSITORY,
        INVENTORY_STATUS_REPOSITORY,
        InventoryDimensionKeyService,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: RecordQcResultUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        receiving: IReceivingRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new RecordQcResultUseCase(
          inboundPlans,
          receiving,
          coreFlows,
          integrations,
          reasonCatalog,
          audited,
          permissionChecker,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        RECEIVING_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
  ],
  exports: [INBOUND_PLAN_REPOSITORY, RECEIVING_REPOSITORY],
})
export class InboundModule {}
