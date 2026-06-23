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
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ConfirmPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ConfirmPutawayTaskUseCase';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
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
import { InventoryMovementOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryMovementOrmEntity';
import { InventoryTransactionOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryTransactionOrmEntity';
import { InventoryTransactionRepository } from '@modules/InventoryExecution/Infrastructure/Persistence/Repositories/InventoryTransactionRepository';
import { PutawayTaskRepository } from '@modules/InventoryExecution/Infrastructure/Persistence/Repositories/PutawayTaskRepository';
import { InventoryControlController } from '@modules/InventoryExecution/Presentation/Controllers/InventoryControlController';
import { PutawayTaskController } from '@modules/InventoryExecution/Presentation/Controllers/PutawayTaskController';
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
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import {
  ITaskExecutionRepository,
  TASK_EXECUTION_REPOSITORY,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { TaskExecutionModule } from '@modules/TaskExecution/TaskExecutionModule';

@Module({
  imports: [
    TypeOrmModule.forFeature([PutawayTaskOrmEntity, InventoryTransactionOrmEntity, InventoryMovementOrmEntity]),
    AccessControlModule,
    MasterDataModule,
    InboundModule,
    IntegrationModule,
    TaskExecutionModule,
  ],
  controllers: [PutawayTaskController, InventoryControlController],
  providers: [
    { provide: PUTAWAY_TASK_REPOSITORY, useClass: PutawayTaskRepository },
    { provide: INVENTORY_TRANSACTION_REPOSITORY, useClass: InventoryTransactionRepository },
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
  ],
  exports: [PUTAWAY_TASK_REPOSITORY, INVENTORY_TRANSACTION_REPOSITORY],
})
export class InventoryExecutionModule {}
