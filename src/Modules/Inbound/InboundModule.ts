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
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { CaptureInboundDiscrepancyUseCase } from '@modules/Inbound/Application/UseCases/CaptureInboundDiscrepancyUseCase';
import { ConfirmReceiptLineUseCase } from '@modules/Inbound/Application/UseCases/ConfirmReceiptLineUseCase';
import { EvaluateQcTaskUseCase } from '@modules/Inbound/Application/UseCases/EvaluateQcTaskUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { RecordQcResultUseCase } from '@modules/Inbound/Application/UseCases/RecordQcResultUseCase';
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
import { IOwnerRepository, OWNER_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository, SKU_REPOSITORY } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository, UOM_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import {
  IWarehouseRepository,
  WAREHOUSE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
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
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InboundPlanOrmEntity,
      InboundPlanLineOrmEntity,
      ReceivingSessionOrmEntity,
      ReceiptOrmEntity,
      ReceiptLineOrmEntity,
      InboundDiscrepancyOrmEntity,
      QcTaskOrmEntity,
      QcResultOrmEntity,
    ]),
    AccessControlModule,
    MasterDataModule,
    PartnerMasterModule,
    CoreFlowModule,
    IntegrationModule,
    WarehouseProfileModule,
  ],
  controllers: [InboundPlanController, ReceiptController, QcTaskController],
  providers: [
    { provide: INBOUND_PLAN_REPOSITORY, useClass: InboundPlanRepository },
    { provide: RECEIVING_REPOSITORY, useClass: ReceivingRepository },
    {
      provide: CreateInboundPlanUseCase,
      useFactory: (
        inboundPlans: IInboundPlanRepository,
        partners: IPartnerRepository,
        owners: IOwnerRepository,
        warehouses: IWarehouseRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        profiles: IWarehouseProfileRepository,
        audited: AuditedTransaction,
      ) =>
        new CreateInboundPlanUseCase(
          inboundPlans,
          partners,
          owners,
          warehouses,
          skus,
          uoms,
          coreFlows,
          integrations,
          profiles,
          audited,
        ),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        PARTNER_REPOSITORY,
        OWNER_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        AuditedTransaction,
      ],
    },
    {
      provide: GetInboundPlanUseCase,
      useFactory: (inboundPlans: IInboundPlanRepository, permissionChecker: IPermissionChecker) =>
        new GetInboundPlanUseCase(inboundPlans, permissionChecker),
      inject: [INBOUND_PLAN_REPOSITORY, PERMISSION_CHECKER],
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
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new ValidateReceivingReadinessUseCase(inboundPlans, profiles, reasonCatalog, audited, permissionChecker),
      inject: [
        INBOUND_PLAN_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
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
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
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
        SKU_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
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
