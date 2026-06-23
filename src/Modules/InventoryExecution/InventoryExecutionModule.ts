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
import { PutawayTaskRepository } from '@modules/InventoryExecution/Infrastructure/Persistence/Repositories/PutawayTaskRepository';
import { PutawayTaskController } from '@modules/InventoryExecution/Presentation/Controllers/PutawayTaskController';
import {
  ILocationProfileRepository,
  LOCATION_PROFILE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import {
  ILocationRepository,
  LOCATION_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import {
  ITaskExecutionRepository,
  TASK_EXECUTION_REPOSITORY,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { TaskExecutionModule } from '@modules/TaskExecution/TaskExecutionModule';

@Module({
  imports: [
    TypeOrmModule.forFeature([PutawayTaskOrmEntity]),
    AccessControlModule,
    MasterDataModule,
    InboundModule,
    IntegrationModule,
    TaskExecutionModule,
  ],
  controllers: [PutawayTaskController],
  providers: [
    { provide: PUTAWAY_TASK_REPOSITORY, useClass: PutawayTaskRepository },
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
  ],
  exports: [PUTAWAY_TASK_REPOSITORY],
})
export class InventoryExecutionModule {}
