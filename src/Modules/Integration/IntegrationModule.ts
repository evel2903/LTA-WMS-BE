import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  IIntegrationRepository,
  INTEGRATION_REPOSITORY,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ImportIntegrationBatchUseCase } from '@modules/Integration/Application/UseCases/ImportIntegrationBatchUseCase';
import { ListImportBatchesUseCase } from '@modules/Integration/Application/UseCases/ListImportBatchesUseCase';
import { ListOutboxMessagesUseCase } from '@modules/Integration/Application/UseCases/ListOutboxMessagesUseCase';
import { RecordOutboxEventUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxEventUseCase';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';
import { IntegrationRepository } from '@modules/Integration/Infrastructure/Persistence/Repositories/IntegrationRepository';
import { IntegrationController } from '@modules/Integration/Presentation/Controllers/IntegrationController';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportBatchOrmEntity, InterfaceMessageOrmEntity, OutboxMessageOrmEntity]),
    AccessControlModule,
  ],
  controllers: [IntegrationController],
  providers: [
    { provide: INTEGRATION_REPOSITORY, useClass: IntegrationRepository },
    {
      provide: ImportIntegrationBatchUseCase,
      useFactory: (integrations: IIntegrationRepository, audited: AuditedTransaction) =>
        new ImportIntegrationBatchUseCase(integrations, audited),
      inject: [INTEGRATION_REPOSITORY, AuditedTransaction],
    },
    {
      provide: ListImportBatchesUseCase,
      useFactory: (integrations: IIntegrationRepository) => new ListImportBatchesUseCase(integrations),
      inject: [INTEGRATION_REPOSITORY],
    },
    {
      provide: ListOutboxMessagesUseCase,
      useFactory: (integrations: IIntegrationRepository) => new ListOutboxMessagesUseCase(integrations),
      inject: [INTEGRATION_REPOSITORY],
    },
    {
      provide: RecordOutboxEventUseCase,
      useFactory: (integrations: IIntegrationRepository, audited: AuditedTransaction) =>
        new RecordOutboxEventUseCase(integrations, audited),
      inject: [INTEGRATION_REPOSITORY, AuditedTransaction],
    },
  ],
  exports: [INTEGRATION_REPOSITORY],
})
export class IntegrationModule {}
