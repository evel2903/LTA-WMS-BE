import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  CORE_FLOW_REPOSITORY,
  ICoreFlowRepository,
} from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CreateCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/CreateCoreFlowInstanceUseCase';
import { CreateWorkflowHandoffUseCase } from '@modules/CoreFlow/Application/UseCases/CreateWorkflowHandoffUseCase';
import { GetCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/GetCoreFlowInstanceUseCase';
import { RecordWorkflowMilestoneUseCase } from '@modules/CoreFlow/Application/UseCases/RecordWorkflowMilestoneUseCase';
import { ResolveCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/ResolveCoreFlowInstanceUseCase';
import { SkipCoreFlowStepUseCase } from '@modules/CoreFlow/Application/UseCases/SkipCoreFlowStepUseCase';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';
import { CoreFlowRepository } from '@modules/CoreFlow/Infrastructure/Persistence/Repositories/CoreFlowRepository';
import { CoreFlowController } from '@modules/CoreFlow/Presentation/Controllers/CoreFlowController';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoreFlowInstanceOrmEntity, WorkflowMilestoneOrmEntity, WorkflowHandoffOrmEntity]),
    AccessControlModule,
  ],
  controllers: [CoreFlowController],
  providers: [
    { provide: CORE_FLOW_REPOSITORY, useClass: CoreFlowRepository },
    {
      provide: CreateCoreFlowInstanceUseCase,
      useFactory: (coreFlows: ICoreFlowRepository, audited: AuditedTransaction) =>
        new CreateCoreFlowInstanceUseCase(coreFlows, audited),
      inject: [CORE_FLOW_REPOSITORY, AuditedTransaction],
    },
    {
      provide: GetCoreFlowInstanceUseCase,
      useFactory: (coreFlows: ICoreFlowRepository) => new GetCoreFlowInstanceUseCase(coreFlows),
      inject: [CORE_FLOW_REPOSITORY],
    },
    {
      provide: ResolveCoreFlowInstanceUseCase,
      useFactory: (coreFlows: ICoreFlowRepository) => new ResolveCoreFlowInstanceUseCase(coreFlows),
      inject: [CORE_FLOW_REPOSITORY],
    },
    {
      provide: RecordWorkflowMilestoneUseCase,
      useFactory: (coreFlows: ICoreFlowRepository, audited: AuditedTransaction) =>
        new RecordWorkflowMilestoneUseCase(coreFlows, audited),
      inject: [CORE_FLOW_REPOSITORY, AuditedTransaction],
    },
    {
      provide: SkipCoreFlowStepUseCase,
      useFactory: (coreFlows: ICoreFlowRepository, audited: AuditedTransaction, reasonCatalog: IReasonCodeCatalog) =>
        new SkipCoreFlowStepUseCase(coreFlows, audited, reasonCatalog),
      inject: [CORE_FLOW_REPOSITORY, AuditedTransaction, REASON_CODE_CATALOG],
    },
    {
      provide: CreateWorkflowHandoffUseCase,
      useFactory: (coreFlows: ICoreFlowRepository, audited: AuditedTransaction, reasonCatalog: IReasonCodeCatalog) =>
        new CreateWorkflowHandoffUseCase(coreFlows, audited, reasonCatalog),
      inject: [CORE_FLOW_REPOSITORY, AuditedTransaction, REASON_CODE_CATALOG],
    },
  ],
  exports: [CORE_FLOW_REPOSITORY],
})
export class CoreFlowModule {}
