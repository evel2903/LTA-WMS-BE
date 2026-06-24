import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PERMISSION_CHECKER,
  IPermissionChecker,
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
  IInventoryTransactionRepository,
  INVENTORY_TRANSACTION_REPOSITORY,
} from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { InventoryExecutionModule } from '@modules/InventoryExecution/InventoryExecutionModule';
import {
  INTEGRATION_REPOSITORY,
  IIntegrationRepository,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationModule } from '@modules/Integration/IntegrationModule';
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
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import { IPackingRepository, PACKING_REPOSITORY } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { OutboundModule } from '@modules/Outbound/OutboundModule';
import {
  IWarehouseProfileRepository,
  WAREHOUSE_PROFILE_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import {
  IShippingStagingRepository,
  SHIPPING_STAGING_REPOSITORY,
} from '@modules/Shipping/Application/Interfaces/IShippingStagingRepository';
import { ShippingStagingLifecycleService } from '@modules/Shipping/Application/Services/ShippingStagingLifecycleService';
import {
  AssignDockUseCase,
  AssignTruckUseCase,
  ConfirmShipmentUseCase,
  EvaluateGoodsIssueTriggerUseCase,
  GetShippingStagingUseCase,
  ListShippingStagingUseCase,
  PostGoodsIssueUseCase,
  RecordGateOutUseCase,
  ScanLoadingUseCase,
  StagePackageUseCase,
} from '@modules/Shipping/Application/UseCases/ShippingStagingUseCases';
import { ShipmentPackageStagingOrmEntity } from '@modules/Shipping/Infrastructure/Persistence/Entities/ShipmentPackageStagingOrmEntity';
import { ShippingStagingRepository } from '@modules/Shipping/Infrastructure/Persistence/Repositories/ShippingStagingRepository';
import { ShippingStagingController } from '@modules/Shipping/Presentation/Controllers/ShippingStagingController';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShipmentPackageStagingOrmEntity]),
    AccessControlModule,
    CoreFlowModule,
    InventoryExecutionModule,
    IntegrationModule,
    MasterDataModule,
    OutboundModule,
    WarehouseProfileModule,
  ],
  controllers: [ShippingStagingController],
  providers: [
    { provide: SHIPPING_STAGING_REPOSITORY, useClass: ShippingStagingRepository },
    {
      provide: ShippingStagingLifecycleService,
      useFactory: (
        stagings: IShippingStagingRepository,
        packing: IPackingRepository,
        coreFlows: ICoreFlowRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
        warehouseProfiles: IWarehouseProfileRepository,
        inventoryTransactions: IInventoryTransactionRepository,
        inventoryBalances: IInventoryBalanceRepository,
        inventoryDimensions: IInventoryDimensionRepository,
        inventoryStatuses: IInventoryStatusRepository,
        locations: ILocationRepository,
      ) =>
        new ShippingStagingLifecycleService(
          stagings,
          packing,
          coreFlows,
          integrations,
          reasonCatalog,
          audited,
          permissionChecker,
          warehouseProfiles,
          inventoryTransactions,
          inventoryBalances,
          inventoryDimensions,
          inventoryStatuses,
          locations,
        ),
      inject: [
        SHIPPING_STAGING_REPOSITORY,
        PACKING_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
        WAREHOUSE_PROFILE_REPOSITORY,
        INVENTORY_TRANSACTION_REPOSITORY,
        INVENTORY_BALANCE_REPOSITORY,
        INVENTORY_DIMENSION_REPOSITORY,
        INVENTORY_STATUS_REPOSITORY,
        LOCATION_REPOSITORY,
      ],
    },
    {
      provide: ListShippingStagingUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new ListShippingStagingUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: GetShippingStagingUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new GetShippingStagingUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: StagePackageUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new StagePackageUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: AssignDockUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new AssignDockUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: AssignTruckUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new AssignTruckUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: ScanLoadingUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new ScanLoadingUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: ConfirmShipmentUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new ConfirmShipmentUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: RecordGateOutUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new RecordGateOutUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: EvaluateGoodsIssueTriggerUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new EvaluateGoodsIssueTriggerUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
    {
      provide: PostGoodsIssueUseCase,
      useFactory: (lifecycle: ShippingStagingLifecycleService) => new PostGoodsIssueUseCase(lifecycle),
      inject: [ShippingStagingLifecycleService],
    },
  ],
  exports: [SHIPPING_STAGING_REPOSITORY],
})
export class ShippingModule {}
