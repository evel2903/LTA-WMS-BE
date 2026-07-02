import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import {
  IExceptionCaseRepository,
  EXCEPTION_CASE_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  IApprovalRequestRepository,
  APPROVAL_REQUEST_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import {
  CreateCycleCountWorkUseCase,
  GetCycleCountWorkUseCase,
  ListCycleCountWorksUseCase,
  PostCycleCountAdjustmentUseCase,
  RecountCycleCountWorkUseCase,
  SubmitCycleCountWorkUseCase,
  UnlockCycleCountWorkUseCase,
} from '@modules/InventoryExecution/Application/UseCases/CycleCountWorkUseCases';
import { CycleCountWorkLifecycleService } from '@modules/InventoryExecution/Application/Services/CycleCountWorkLifecycleService';
import { ReplenishmentTaskLifecycleService } from '@modules/InventoryExecution/Application/Services/ReplenishmentTaskLifecycleService';
import {
  CancelReplenishmentTaskUseCase,
  ConfirmReplenishmentTaskUseCase,
  GetReplenishmentTaskUseCase,
  ListReplenishmentTasksUseCase,
  RecordInventoryReconciliationFailureUseCase,
  ReleaseReplenishmentTaskUseCase,
} from '@modules/InventoryExecution/Application/UseCases/ReplenishmentTaskUseCases';
import { ConfirmPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ConfirmPutawayTaskUseCase';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import {
  ICycleCountWorkRepository,
  CYCLE_COUNT_WORK_REPOSITORY,
} from '@modules/InventoryExecution/Application/Interfaces/ICycleCountWorkRepository';
import {
  IReplenishmentTaskRepository,
  REPLENISHMENT_TASK_REPOSITORY,
} from '@modules/InventoryExecution/Application/Interfaces/IReplenishmentTaskRepository';
import {
  IInventoryTransactionRepository,
  INVENTORY_TRANSACTION_REPOSITORY,
} from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import {
  IReceivingRepository,
  RECEIVING_REPOSITORY,
} from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { InboundModule } from '@modules/Inbound/InboundModule';
import {
  IIntegrationRepository,
  INTEGRATION_REPOSITORY,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationModule } from '@modules/Integration/IntegrationModule';
import { GetPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/GetPutawayTaskUseCase';
import { ListPutawayTasksUseCase } from '@modules/InventoryExecution/Application/UseCases/ListPutawayTasksUseCase';
import { ReleasePutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ReleasePutawayTaskUseCase';
import {
  IPutawayTaskRepository,
  PUTAWAY_TASK_REPOSITORY,
} from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { PutawayTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/PutawayTaskOrmEntity';
import { CycleCountWorkOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/CycleCountWorkOrmEntity';
import { ReplenishmentTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/ReplenishmentTaskOrmEntity';
import { InventoryMovementOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryMovementOrmEntity';
import { InventoryTransactionOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryTransactionOrmEntity';
import { CycleCountWorkRepository } from '@modules/InventoryExecution/Infrastructure/Persistence/Repositories/CycleCountWorkRepository';
import { InventoryTransactionRepository } from '@modules/InventoryExecution/Infrastructure/Persistence/Repositories/InventoryTransactionRepository';
import { PutawayTaskRepository } from '@modules/InventoryExecution/Infrastructure/Persistence/Repositories/PutawayTaskRepository';
import { ReplenishmentTaskRepository } from '@modules/InventoryExecution/Infrastructure/Persistence/Repositories/ReplenishmentTaskRepository';
import { CycleCountWorkController } from '@modules/InventoryExecution/Presentation/Controllers/CycleCountWorkController';
import { InventoryControlController } from '@modules/InventoryExecution/Presentation/Controllers/InventoryControlController';
import { PutawayTaskController } from '@modules/InventoryExecution/Presentation/Controllers/PutawayTaskController';
import { ReplenishmentTaskController } from '@modules/InventoryExecution/Presentation/Controllers/ReplenishmentTaskController';
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
  ILocationProfileRepository,
  LOCATION_PROFILE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import {
  ILocationRepository,
  LOCATION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import {
  IItemCoverageRepository,
  ITEM_COVERAGE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import {
  IWarehouseRepository,
  WAREHOUSE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import {
  ITaskExecutionRepository,
  TASK_EXECUTION_REPOSITORY,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { TaskExecutionModule } from '@modules/TaskExecution/TaskExecutionModule';
import { IRuleResolver, RULE_RESOLVER } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import { PutawayRuleGate } from '@modules/InventoryExecution/Application/Services/PutawayRuleGate';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PutawayTaskOrmEntity,
      InventoryTransactionOrmEntity,
      InventoryMovementOrmEntity,
      CycleCountWorkOrmEntity,
      ReplenishmentTaskOrmEntity,
    ]),
    AccessControlModule,
    MasterDataModule,
    InboundModule,
    IntegrationModule,
    TaskExecutionModule,
    WarehouseProfileModule,
  ],
  controllers: [
    PutawayTaskController,
    InventoryControlController,
    CycleCountWorkController,
    ReplenishmentTaskController,
  ],
  providers: [
    { provide: PUTAWAY_TASK_REPOSITORY, useClass: PutawayTaskRepository },
    { provide: INVENTORY_TRANSACTION_REPOSITORY, useClass: InventoryTransactionRepository },
    { provide: CYCLE_COUNT_WORK_REPOSITORY, useClass: CycleCountWorkRepository },
    { provide: REPLENISHMENT_TASK_REPOSITORY, useClass: ReplenishmentTaskRepository },
    {
      provide: PutawayRuleGate,
      useFactory: (resolver: IRuleResolver, warehouses: IWarehouseRepository) =>
        new PutawayRuleGate(resolver, warehouses),
      inject: [RULE_RESOLVER, WAREHOUSE_REPOSITORY],
    },
    {
      provide: ListPutawayTasksUseCase,
      useFactory: (tasks: IPutawayTaskRepository, checker: IPermissionChecker) =>
        new ListPutawayTasksUseCase(tasks, checker),
      inject: [PUTAWAY_TASK_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: GetPutawayTaskUseCase,
      useFactory: (tasks: IPutawayTaskRepository, checker: IPermissionChecker) =>
        new GetPutawayTaskUseCase(tasks, checker),
      inject: [PUTAWAY_TASK_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: ReleasePutawayTaskUseCase,
      useFactory: (
        putawayTasks: IPutawayTaskRepository,
        receiving: IReceivingRepository,
        locations: ILocationRepository,
        locationProfiles: ILocationProfileRepository,
        integrations: IIntegrationRepository,
        taskExecution: ITaskExecutionRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        checker: IPermissionChecker,
      ) =>
        new ReleasePutawayTaskUseCase(
          putawayTasks,
          receiving,
          locations,
          locationProfiles,
          integrations,
          taskExecution,
          reasonCatalog,
          audited,
          checker,
        ),
      inject: [
        PUTAWAY_TASK_REPOSITORY,
        RECEIVING_REPOSITORY,
        LOCATION_REPOSITORY,
        LOCATION_PROFILE_REPOSITORY,
        INTEGRATION_REPOSITORY,
        TASK_EXECUTION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ConfirmPutawayTaskUseCase,
      useFactory: (
        putawayTasks: IPutawayTaskRepository,
        inventoryTransactions: IInventoryTransactionRepository,
        inventoryStatuses: IInventoryStatusRepository,
        inventoryDimensions: IInventoryDimensionRepository,
        inventoryBalances: IInventoryBalanceRepository,
        integrations: IIntegrationRepository,
        taskExecution: ITaskExecutionRepository,
        dimensionKeyService: InventoryDimensionKeyService,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        checker: IPermissionChecker,
      ) =>
        new ConfirmPutawayTaskUseCase(
          putawayTasks,
          inventoryTransactions,
          inventoryStatuses,
          inventoryDimensions,
          inventoryBalances,
          integrations,
          taskExecution,
          dimensionKeyService,
          reasonCatalog,
          audited,
          checker,
        ),
      inject: [
        PUTAWAY_TASK_REPOSITORY,
        INVENTORY_TRANSACTION_REPOSITORY,
        INVENTORY_STATUS_REPOSITORY,
        INVENTORY_DIMENSION_REPOSITORY,
        INVENTORY_BALANCE_REPOSITORY,
        INTEGRATION_REPOSITORY,
        TASK_EXECUTION_REPOSITORY,
        InventoryDimensionKeyService,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: InventoryControlUseCase,
      useFactory: (
        inventoryTransactions: IInventoryTransactionRepository,
        inventoryStatuses: IInventoryStatusRepository,
        inventoryDimensions: IInventoryDimensionRepository,
        inventoryBalances: IInventoryBalanceRepository,
        locations: ILocationRepository,
        integrations: IIntegrationRepository,
        dimensionKeyService: InventoryDimensionKeyService,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        checker: IPermissionChecker,
      ) =>
        new InventoryControlUseCase(
          inventoryTransactions,
          inventoryStatuses,
          inventoryDimensions,
          inventoryBalances,
          locations,
          integrations,
          dimensionKeyService,
          reasonCatalog,
          audited,
          checker,
        ),
      inject: [
        INVENTORY_TRANSACTION_REPOSITORY,
        INVENTORY_STATUS_REPOSITORY,
        INVENTORY_DIMENSION_REPOSITORY,
        INVENTORY_BALANCE_REPOSITORY,
        LOCATION_REPOSITORY,
        INTEGRATION_REPOSITORY,
        InventoryDimensionKeyService,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: CycleCountWorkLifecycleService,
      useFactory: (
        cycleCountWorks: ICycleCountWorkRepository,
        inventoryControl: InventoryControlUseCase,
        inventoryTransactions: IInventoryTransactionRepository,
        approvalRequests: IApprovalRequestRepository,
        inventoryBalances: IInventoryBalanceRepository,
        inventoryDimensions: IInventoryDimensionRepository,
        inventoryStatuses: IInventoryStatusRepository,
        locations: ILocationRepository,
        integrations: IIntegrationRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        checker: IPermissionChecker,
      ) =>
        new CycleCountWorkLifecycleService(
          cycleCountWorks,
          inventoryControl,
          inventoryTransactions,
          approvalRequests,
          inventoryBalances,
          inventoryDimensions,
          inventoryStatuses,
          locations,
          integrations,
          reasonCatalog,
          audited,
          checker,
        ),
      inject: [
        CYCLE_COUNT_WORK_REPOSITORY,
        InventoryControlUseCase,
        INVENTORY_TRANSACTION_REPOSITORY,
        APPROVAL_REQUEST_REPOSITORY,
        INVENTORY_BALANCE_REPOSITORY,
        INVENTORY_DIMENSION_REPOSITORY,
        INVENTORY_STATUS_REPOSITORY,
        LOCATION_REPOSITORY,
        INTEGRATION_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: CreateCycleCountWorkUseCase,
      useFactory: (lifecycle: CycleCountWorkLifecycleService) => new CreateCycleCountWorkUseCase(lifecycle),
      inject: [CycleCountWorkLifecycleService],
    },
    {
      provide: ListCycleCountWorksUseCase,
      useFactory: (lifecycle: CycleCountWorkLifecycleService) => new ListCycleCountWorksUseCase(lifecycle),
      inject: [CycleCountWorkLifecycleService],
    },
    {
      provide: GetCycleCountWorkUseCase,
      useFactory: (lifecycle: CycleCountWorkLifecycleService) => new GetCycleCountWorkUseCase(lifecycle),
      inject: [CycleCountWorkLifecycleService],
    },
    {
      provide: SubmitCycleCountWorkUseCase,
      useFactory: (lifecycle: CycleCountWorkLifecycleService) => new SubmitCycleCountWorkUseCase(lifecycle),
      inject: [CycleCountWorkLifecycleService],
    },
    {
      provide: RecountCycleCountWorkUseCase,
      useFactory: (lifecycle: CycleCountWorkLifecycleService) => new RecountCycleCountWorkUseCase(lifecycle),
      inject: [CycleCountWorkLifecycleService],
    },
    {
      provide: PostCycleCountAdjustmentUseCase,
      useFactory: (lifecycle: CycleCountWorkLifecycleService) => new PostCycleCountAdjustmentUseCase(lifecycle),
      inject: [CycleCountWorkLifecycleService],
    },
    {
      provide: UnlockCycleCountWorkUseCase,
      useFactory: (lifecycle: CycleCountWorkLifecycleService) => new UnlockCycleCountWorkUseCase(lifecycle),
      inject: [CycleCountWorkLifecycleService],
    },
    {
      provide: ReplenishmentTaskLifecycleService,
      useFactory: (
        replenishmentTasks: IReplenishmentTaskRepository,
        inventoryControl: InventoryControlUseCase,
        inventoryBalances: IInventoryBalanceRepository,
        inventoryDimensions: IInventoryDimensionRepository,
        inventoryStatuses: IInventoryStatusRepository,
        locations: ILocationRepository,
        locationProfiles: ILocationProfileRepository,
        itemCoverages: IItemCoverageRepository,
        integrations: IIntegrationRepository,
        exceptionCases: IExceptionCaseRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        checker: IPermissionChecker,
      ) =>
        new ReplenishmentTaskLifecycleService(
          replenishmentTasks,
          inventoryControl,
          inventoryBalances,
          inventoryDimensions,
          inventoryStatuses,
          locations,
          locationProfiles,
          itemCoverages,
          integrations,
          exceptionCases,
          reasonCatalog,
          audited,
          checker,
        ),
      inject: [
        REPLENISHMENT_TASK_REPOSITORY,
        InventoryControlUseCase,
        INVENTORY_BALANCE_REPOSITORY,
        INVENTORY_DIMENSION_REPOSITORY,
        INVENTORY_STATUS_REPOSITORY,
        LOCATION_REPOSITORY,
        LOCATION_PROFILE_REPOSITORY,
        ITEM_COVERAGE_REPOSITORY,
        INTEGRATION_REPOSITORY,
        EXCEPTION_CASE_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
    {
      provide: ReleaseReplenishmentTaskUseCase,
      useFactory: (lifecycle: ReplenishmentTaskLifecycleService) => new ReleaseReplenishmentTaskUseCase(lifecycle),
      inject: [ReplenishmentTaskLifecycleService],
    },
    {
      provide: ListReplenishmentTasksUseCase,
      useFactory: (lifecycle: ReplenishmentTaskLifecycleService) => new ListReplenishmentTasksUseCase(lifecycle),
      inject: [ReplenishmentTaskLifecycleService],
    },
    {
      provide: GetReplenishmentTaskUseCase,
      useFactory: (lifecycle: ReplenishmentTaskLifecycleService) => new GetReplenishmentTaskUseCase(lifecycle),
      inject: [ReplenishmentTaskLifecycleService],
    },
    {
      provide: ConfirmReplenishmentTaskUseCase,
      useFactory: (lifecycle: ReplenishmentTaskLifecycleService) => new ConfirmReplenishmentTaskUseCase(lifecycle),
      inject: [ReplenishmentTaskLifecycleService],
    },
    {
      provide: CancelReplenishmentTaskUseCase,
      useFactory: (lifecycle: ReplenishmentTaskLifecycleService) => new CancelReplenishmentTaskUseCase(lifecycle),
      inject: [ReplenishmentTaskLifecycleService],
    },
    {
      provide: RecordInventoryReconciliationFailureUseCase,
      useFactory: (lifecycle: ReplenishmentTaskLifecycleService) =>
        new RecordInventoryReconciliationFailureUseCase(lifecycle),
      inject: [ReplenishmentTaskLifecycleService],
    },
  ],
  exports: [
    PUTAWAY_TASK_REPOSITORY,
    INVENTORY_TRANSACTION_REPOSITORY,
    CYCLE_COUNT_WORK_REPOSITORY,
    REPLENISHMENT_TASK_REPOSITORY,
    InventoryControlUseCase,
    ReleaseReplenishmentTaskUseCase,
  ],
})
export class InventoryExecutionModule {}
