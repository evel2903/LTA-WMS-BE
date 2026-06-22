import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import {
  PERMISSION_CHECKER,
  IPermissionChecker,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  ISkuBarcodeRepository,
  SKU_BARCODE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import {
  ITaskExecutionRepository,
  TASK_EXECUTION_REPOSITORY,
} from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { ClaimMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ClaimMobileTaskUseCase';
import { GetMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/GetMobileTaskUseCase';
import { ListMobileTasksUseCase } from '@modules/TaskExecution/Application/UseCases/ListMobileTasksUseCase';
import { RecordMobileScanUseCase } from '@modules/TaskExecution/Application/UseCases/RecordMobileScanUseCase';
import { ReleaseMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ReleaseMobileTaskUseCase';
import { MobileScanEventOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileScanEventOrmEntity';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';
import { TaskExecutionRepository } from '@modules/TaskExecution/Infrastructure/Persistence/Repositories/TaskExecutionRepository';
import { TaskExecutionController } from '@modules/TaskExecution/Presentation/Controllers/TaskExecutionController';

@Module({
  imports: [
    TypeOrmModule.forFeature([MobileTaskOrmEntity, MobileScanEventOrmEntity]),
    AccessControlModule,
    MasterDataModule,
  ],
  controllers: [TaskExecutionController],
  providers: [
    { provide: TASK_EXECUTION_REPOSITORY, useClass: TaskExecutionRepository },
    {
      provide: ListMobileTasksUseCase,
      useFactory: (tasks: ITaskExecutionRepository, checker: IPermissionChecker) =>
        new ListMobileTasksUseCase(tasks, checker),
      inject: [TASK_EXECUTION_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: GetMobileTaskUseCase,
      useFactory: (tasks: ITaskExecutionRepository, checker: IPermissionChecker) =>
        new GetMobileTaskUseCase(tasks, checker),
      inject: [TASK_EXECUTION_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: ClaimMobileTaskUseCase,
      useFactory: (tasks: ITaskExecutionRepository, checker: IPermissionChecker, audited: AuditedTransaction) =>
        new ClaimMobileTaskUseCase(tasks, checker, audited),
      inject: [TASK_EXECUTION_REPOSITORY, PERMISSION_CHECKER, AuditedTransaction],
    },
    {
      provide: ReleaseMobileTaskUseCase,
      useFactory: (tasks: ITaskExecutionRepository, checker: IPermissionChecker, audited: AuditedTransaction) =>
        new ReleaseMobileTaskUseCase(tasks, checker, audited),
      inject: [TASK_EXECUTION_REPOSITORY, PERMISSION_CHECKER, AuditedTransaction],
    },
    {
      provide: RecordMobileScanUseCase,
      useFactory: (
        tasks: ITaskExecutionRepository,
        skuBarcodes: ISkuBarcodeRepository,
        checker: IPermissionChecker,
        audited: AuditedTransaction,
        reasonCatalog: IReasonCodeCatalog,
      ) => new RecordMobileScanUseCase(tasks, skuBarcodes, checker, audited, reasonCatalog),
      inject: [
        TASK_EXECUTION_REPOSITORY,
        SKU_BARCODE_REPOSITORY,
        PERMISSION_CHECKER,
        AuditedTransaction,
        REASON_CODE_CATALOG,
      ],
    },
  ],
  exports: [TASK_EXECUTION_REPOSITORY],
})
export class TaskExecutionModule {}
