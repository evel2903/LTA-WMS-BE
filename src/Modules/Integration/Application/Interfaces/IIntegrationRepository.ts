import { EntityManager } from 'typeorm';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';

export const INTEGRATION_REPOSITORY = Symbol('INTEGRATION_REPOSITORY');

export interface IntegrationReadOptions {
  Lock?: boolean;
}

export interface IntegrationListFilter {
  SourceSystem?: string;
  Status?: string;
  EventType?: string;
  BusinessReference?: string;
  WarehouseContext?: string;
  OwnerContext?: string;
  CreatedFrom?: Date;
  CreatedTo?: Date;
  UpdatedFrom?: Date;
  UpdatedTo?: Date;
}

export interface IIntegrationRepository {
  FindInterfaceMessageByMessageId(messageId: string): Promise<InterfaceMessageEntity | null>;
  FindOutboxMessageByMessageId(messageId: string, manager?: EntityManager): Promise<OutboxMessageEntity | null>;
  FindOutboxMessageById(
    id: string,
    manager?: EntityManager,
    options?: IntegrationReadOptions,
  ): Promise<OutboxMessageEntity | null>;
  CreateImport(
    importBatch: ImportBatchEntity,
    interfaceMessages: InterfaceMessageEntity[],
    outboxMessages: OutboxMessageEntity[],
    manager?: EntityManager,
  ): Promise<{
    ImportBatch: ImportBatchEntity;
    InterfaceMessages: InterfaceMessageEntity[];
    OutboxMessages: OutboxMessageEntity[];
  }>;
  CreateOutboxMessage(outboxMessage: OutboxMessageEntity, manager?: EntityManager): Promise<OutboxMessageEntity>;
  UpdateOutboxMessage(outboxMessage: OutboxMessageEntity, manager?: EntityManager): Promise<OutboxMessageEntity>;
  ListImportBatches(
    skip: number,
    take: number,
    filter?: IntegrationListFilter,
  ): Promise<{ Items: ImportBatchEntity[]; TotalItems: number }>;
  ListOutboxMessages(
    skip: number,
    take: number,
    filter?: IntegrationListFilter,
  ): Promise<{ Items: OutboxMessageEntity[]; TotalItems: number }>;
}
