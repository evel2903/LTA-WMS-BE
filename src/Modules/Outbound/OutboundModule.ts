import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import {
  APPROVAL_REQUEST_REPOSITORY,
  IApprovalRequestRepository,
} from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import {
  CONTROL_EXCEPTION_CATALOG,
  IControlExceptionCatalog,
} from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import {
  EXCEPTION_CASE_REPOSITORY,
  IExceptionCaseRepository,
} from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import {
  CORE_FLOW_REPOSITORY,
  ICoreFlowRepository,
} from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowModule } from '@modules/CoreFlow/CoreFlowModule';
import {
  IIntegrationRepository,
  INTEGRATION_REPOSITORY,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationModule } from '@modules/Integration/IntegrationModule';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { ReleaseReplenishmentTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ReplenishmentTaskUseCases';
import { InventoryExecutionModule } from '@modules/InventoryExecution/InventoryExecutionModule';
import {
  IItemCoverageRepository,
  ITEM_COVERAGE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import {
  IInventoryBalanceRepository,
  INVENTORY_BALANCE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IOwnerRepository, OWNER_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository, SKU_REPOSITORY } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository, UOM_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import {
  IWarehouseRepository,
  WAREHOUSE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import {
  ALLOCATION_INVENTORY_REPOSITORY,
  IAllocationInventoryRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationInventoryRepository';
import {
  ALLOCATION_REPOSITORY,
  IAllocationRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationRepository';
import {
  IPickReleaseRepository,
  PICK_RELEASE_REPOSITORY,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import {
  IOutboundOrderRepository,
  OUTBOUND_ORDER_REPOSITORY,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { AllocationLifecycleService } from '@modules/Outbound/Application/Services/AllocationLifecycleService';
import { OutboundOrderLifecycleService } from '@modules/Outbound/Application/Services/OutboundOrderLifecycleService';
import { PickReleaseLifecycleService } from '@modules/Outbound/Application/Services/PickReleaseLifecycleService';
import { PickTaskConfirmationService } from '@modules/Outbound/Application/Services/PickTaskConfirmationService';
import { PickTaskExceptionService } from '@modules/Outbound/Application/Services/PickTaskExceptionService';
import {
  AllocateOutboundOrderUseCase,
  GetAllocationUseCase,
  ListAllocationsUseCase,
} from '@modules/Outbound/Application/UseCases/AllocationUseCases';
import {
  CancelOutboundOrderUseCase,
  GetOutboundOrderUseCase,
  HoldOutboundOrderUseCase,
  ImportOutboundOrderUseCase,
  ListOutboundOrdersUseCase,
  RejectOutboundOrderUseCase,
  ValidateOutboundOrderUseCase,
} from '@modules/Outbound/Application/UseCases/OutboundOrderUseCases';
import {
  GetPickReleaseUseCase,
  ListPickReleasesUseCase,
  ReleaseOutboundOrderUseCase,
} from '@modules/Outbound/Application/UseCases/PickReleaseUseCases';
import { ConfirmPickTaskUseCase } from '@modules/Outbound/Application/UseCases/PickTaskConfirmUseCases';
import {
  ReportPickExceptionUseCase,
  RequestPickSubstitutionUseCase,
} from '@modules/Outbound/Application/UseCases/PickTaskExceptionUseCases';
import { AllocationLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationLineOrmEntity';
import { AllocationOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationOrmEntity';
import { OutboundOrderLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderLineOrmEntity';
import { OutboundOrderOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderOrmEntity';
import { PickReleaseOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickReleaseOrmEntity';
import { PickTaskOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickTaskOrmEntity';
import { AllocationInventoryRepository } from '@modules/Outbound/Infrastructure/Persistence/Repositories/AllocationInventoryRepository';
import { AllocationRepository } from '@modules/Outbound/Infrastructure/Persistence/Repositories/AllocationRepository';
import { OutboundOrderRepository } from '@modules/Outbound/Infrastructure/Persistence/Repositories/OutboundOrderRepository';
import { PickReleaseRepository } from '@modules/Outbound/Infrastructure/Persistence/Repositories/PickReleaseRepository';
import { OutboundOrderController } from '@modules/Outbound/Presentation/Controllers/OutboundOrderController';
import {
  MobilePickTaskController,
  PickTaskController,
} from '@modules/Outbound/Presentation/Controllers/PickTaskController';
import {
  IPartnerRepository,
  PARTNER_REPOSITORY,
} from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerMasterModule } from '@modules/PartnerMaster/PartnerMasterModule';
import {
  ITaskExecutionRepository,
  TASK_EXECUTION_REPOSITORY,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { TaskExecutionModule } from '@modules/TaskExecution/TaskExecutionModule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutboundOrderOrmEntity,
      OutboundOrderLineOrmEntity,
      AllocationOrmEntity,
      AllocationLineOrmEntity,
      PickReleaseOrmEntity,
      PickTaskOrmEntity,
      InventoryBalanceOrmEntity,
    ]),
    AccessControlModule,
    MasterDataModule,
    PartnerMasterModule,
    CoreFlowModule,
    IntegrationModule,
    TaskExecutionModule,
    InventoryExecutionModule,
  ],
  controllers: [OutboundOrderController, PickTaskController, MobilePickTaskController],
  providers: [
    { provide: OUTBOUND_ORDER_REPOSITORY, useClass: OutboundOrderRepository },
    { provide: ALLOCATION_REPOSITORY, useClass: AllocationRepository },
    { provide: PICK_RELEASE_REPOSITORY, useClass: PickReleaseRepository },
    { provide: ALLOCATION_INVENTORY_REPOSITORY, useClass: AllocationInventoryRepository },
    {
      provide: OutboundOrderLifecycleService,
      useFactory: (
        outboundOrders: IOutboundOrderRepository,
        partners: IPartnerRepository,
        owners: IOwnerRepository,
        warehouses: IWarehouseRepository,
        skus: ISkuRepository,
        uoms: IUomRepository,
        itemCoverages: IItemCoverageRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
        pickReleases: IPickReleaseRepository,
      ) =>
        new OutboundOrderLifecycleService(
          outboundOrders,
          partners,
          owners,
          warehouses,
          skus,
          uoms,
          itemCoverages,
          coreFlows,
          integrations,
          reasonCatalog,
          audited,
          permissionChecker,
          pickReleases,
        ),
      inject: [
        OUTBOUND_ORDER_REPOSITORY,
        PARTNER_REPOSITORY,
        OWNER_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        SKU_REPOSITORY,
        UOM_REPOSITORY,
        ITEM_COVERAGE_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
        PICK_RELEASE_REPOSITORY,
      ],
    },
    {
      provide: ImportOutboundOrderUseCase,
      useFactory: (lifecycle: OutboundOrderLifecycleService) => new ImportOutboundOrderUseCase(lifecycle),
      inject: [OutboundOrderLifecycleService],
    },
    {
      provide: ListOutboundOrdersUseCase,
      useFactory: (lifecycle: OutboundOrderLifecycleService) => new ListOutboundOrdersUseCase(lifecycle),
      inject: [OutboundOrderLifecycleService],
    },
    {
      provide: GetOutboundOrderUseCase,
      useFactory: (lifecycle: OutboundOrderLifecycleService) => new GetOutboundOrderUseCase(lifecycle),
      inject: [OutboundOrderLifecycleService],
    },
    {
      provide: ValidateOutboundOrderUseCase,
      useFactory: (lifecycle: OutboundOrderLifecycleService) => new ValidateOutboundOrderUseCase(lifecycle),
      inject: [OutboundOrderLifecycleService],
    },
    {
      provide: HoldOutboundOrderUseCase,
      useFactory: (lifecycle: OutboundOrderLifecycleService) => new HoldOutboundOrderUseCase(lifecycle),
      inject: [OutboundOrderLifecycleService],
    },
    {
      provide: RejectOutboundOrderUseCase,
      useFactory: (lifecycle: OutboundOrderLifecycleService) => new RejectOutboundOrderUseCase(lifecycle),
      inject: [OutboundOrderLifecycleService],
    },
    {
      provide: CancelOutboundOrderUseCase,
      useFactory: (lifecycle: OutboundOrderLifecycleService) => new CancelOutboundOrderUseCase(lifecycle),
      inject: [OutboundOrderLifecycleService],
    },
    {
      provide: AllocationLifecycleService,
      useFactory: (
        allocations: IAllocationRepository,
        allocationInventory: IAllocationInventoryRepository,
        outboundOrders: IOutboundOrderRepository,
        inventoryBalances: IInventoryBalanceRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new AllocationLifecycleService(
          allocations,
          allocationInventory,
          outboundOrders,
          inventoryBalances,
          coreFlows,
          integrations,
          reasonCatalog,
          audited,
          permissionChecker,
        ),
      inject: [
        ALLOCATION_REPOSITORY,
        ALLOCATION_INVENTORY_REPOSITORY,
        OUTBOUND_ORDER_REPOSITORY,
        INVENTORY_BALANCE_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: AllocateOutboundOrderUseCase,
      useFactory: (lifecycle: AllocationLifecycleService) => new AllocateOutboundOrderUseCase(lifecycle),
      inject: [AllocationLifecycleService],
    },
    {
      provide: ListAllocationsUseCase,
      useFactory: (lifecycle: AllocationLifecycleService) => new ListAllocationsUseCase(lifecycle),
      inject: [AllocationLifecycleService],
    },
    {
      provide: GetAllocationUseCase,
      useFactory: (lifecycle: AllocationLifecycleService) => new GetAllocationUseCase(lifecycle),
      inject: [AllocationLifecycleService],
    },
    {
      provide: PickReleaseLifecycleService,
      useFactory: (
        releases: IPickReleaseRepository,
        allocations: IAllocationRepository,
        outboundOrders: IOutboundOrderRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
        taskExecution: ITaskExecutionRepository,
      ) =>
        new PickReleaseLifecycleService(
          releases,
          allocations,
          outboundOrders,
          coreFlows,
          integrations,
          reasonCatalog,
          audited,
          permissionChecker,
          taskExecution,
        ),
      inject: [
        PICK_RELEASE_REPOSITORY,
        ALLOCATION_REPOSITORY,
        OUTBOUND_ORDER_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
        TASK_EXECUTION_REPOSITORY,
      ],
    },
    {
      provide: PickTaskConfirmationService,
      useFactory: (
        pickReleases: IPickReleaseRepository,
        outboundOrders: IOutboundOrderRepository,
        taskExecution: ITaskExecutionRepository,
        inventoryControl: InventoryControlUseCase,
        integrations: IIntegrationRepository,
        coreFlows: ICoreFlowRepository,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) =>
        new PickTaskConfirmationService(
          pickReleases,
          outboundOrders,
          taskExecution,
          inventoryControl,
          integrations,
          coreFlows,
          audited,
          permissionChecker,
        ),
      inject: [
        PICK_RELEASE_REPOSITORY,
        OUTBOUND_ORDER_REPOSITORY,
        TASK_EXECUTION_REPOSITORY,
        InventoryControlUseCase,
        INTEGRATION_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ConfirmPickTaskUseCase,
      useFactory: (service: PickTaskConfirmationService) => new ConfirmPickTaskUseCase(service),
      inject: [PickTaskConfirmationService],
    },
    {
      provide: PickTaskExceptionService,
      useFactory: (
        pickReleases: IPickReleaseRepository,
        taskExecution: ITaskExecutionRepository,
        exceptionCases: IExceptionCaseRepository,
        controlExceptionCatalog: IControlExceptionCatalog,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        approvalRequests: IApprovalRequestRepository,
        createApprovalRequest: CreateApprovalRequestUseCase,
        releaseReplenishmentTask: ReleaseReplenishmentTaskUseCase,
        permissionChecker: IPermissionChecker,
      ) =>
        new PickTaskExceptionService(
          pickReleases,
          taskExecution,
          exceptionCases,
          controlExceptionCatalog,
          reasonCatalog,
          audited,
          approvalRequests,
          createApprovalRequest,
          releaseReplenishmentTask,
          permissionChecker,
        ),
      inject: [
        PICK_RELEASE_REPOSITORY,
        TASK_EXECUTION_REPOSITORY,
        EXCEPTION_CASE_REPOSITORY,
        CONTROL_EXCEPTION_CATALOG,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        APPROVAL_REQUEST_REPOSITORY,
        CreateApprovalRequestUseCase,
        ReleaseReplenishmentTaskUseCase,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ReportPickExceptionUseCase,
      useFactory: (service: PickTaskExceptionService) => new ReportPickExceptionUseCase(service),
      inject: [PickTaskExceptionService],
    },
    {
      provide: RequestPickSubstitutionUseCase,
      useFactory: (service: PickTaskExceptionService) => new RequestPickSubstitutionUseCase(service),
      inject: [PickTaskExceptionService],
    },
    {
      provide: ReleaseOutboundOrderUseCase,
      useFactory: (lifecycle: PickReleaseLifecycleService) => new ReleaseOutboundOrderUseCase(lifecycle),
      inject: [PickReleaseLifecycleService],
    },
    {
      provide: ListPickReleasesUseCase,
      useFactory: (lifecycle: PickReleaseLifecycleService) => new ListPickReleasesUseCase(lifecycle),
      inject: [PickReleaseLifecycleService],
    },
    {
      provide: GetPickReleaseUseCase,
      useFactory: (lifecycle: PickReleaseLifecycleService) => new GetPickReleaseUseCase(lifecycle),
      inject: [PickReleaseLifecycleService],
    },
  ],
  exports: [OUTBOUND_ORDER_REPOSITORY, ALLOCATION_REPOSITORY, PICK_RELEASE_REPOSITORY],
})
export class OutboundModule {}
