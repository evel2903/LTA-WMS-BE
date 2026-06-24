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
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
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
  IOutboundOrderRepository,
  OUTBOUND_ORDER_REPOSITORY,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { AllocationLifecycleService } from '@modules/Outbound/Application/Services/AllocationLifecycleService';
import { OutboundOrderLifecycleService } from '@modules/Outbound/Application/Services/OutboundOrderLifecycleService';
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
import { AllocationLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationLineOrmEntity';
import { AllocationOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationOrmEntity';
import { OutboundOrderLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderLineOrmEntity';
import { OutboundOrderOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderOrmEntity';
import { AllocationInventoryRepository } from '@modules/Outbound/Infrastructure/Persistence/Repositories/AllocationInventoryRepository';
import { AllocationRepository } from '@modules/Outbound/Infrastructure/Persistence/Repositories/AllocationRepository';
import { OutboundOrderRepository } from '@modules/Outbound/Infrastructure/Persistence/Repositories/OutboundOrderRepository';
import { OutboundOrderController } from '@modules/Outbound/Presentation/Controllers/OutboundOrderController';
import {
  IPartnerRepository,
  PARTNER_REPOSITORY,
} from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerMasterModule } from '@modules/PartnerMaster/PartnerMasterModule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutboundOrderOrmEntity,
      OutboundOrderLineOrmEntity,
      AllocationOrmEntity,
      AllocationLineOrmEntity,
      InventoryBalanceOrmEntity,
    ]),
    AccessControlModule,
    MasterDataModule,
    PartnerMasterModule,
    CoreFlowModule,
    IntegrationModule,
  ],
  controllers: [OutboundOrderController],
  providers: [
    { provide: OUTBOUND_ORDER_REPOSITORY, useClass: OutboundOrderRepository },
    { provide: ALLOCATION_REPOSITORY, useClass: AllocationRepository },
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
  ],
  exports: [OUTBOUND_ORDER_REPOSITORY, ALLOCATION_REPOSITORY],
})
export class OutboundModule {}
