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
import { IPackingRepository, PACKING_REPOSITORY } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { OutboundModule } from '@modules/Outbound/OutboundModule';
import {
  IShippingStagingRepository,
  SHIPPING_STAGING_REPOSITORY,
} from '@modules/Shipping/Application/Interfaces/IShippingStagingRepository';
import { ShippingStagingLifecycleService } from '@modules/Shipping/Application/Services/ShippingStagingLifecycleService';
import {
  AssignDockUseCase,
  AssignTruckUseCase,
  GetShippingStagingUseCase,
  ListShippingStagingUseCase,
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
    OutboundModule,
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
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new ShippingStagingLifecycleService(stagings, packing, coreFlows, reasonCatalog, audited, permissionChecker),
      inject: [
        SHIPPING_STAGING_REPOSITORY,
        PACKING_REPOSITORY,
        CORE_FLOW_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
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
  ],
  exports: [SHIPPING_STAGING_REPOSITORY],
})
export class ShippingModule {}
