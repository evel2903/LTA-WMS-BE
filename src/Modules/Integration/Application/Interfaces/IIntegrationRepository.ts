import { EntityManager } from 'typeorm';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { IntegrationReconciliationItemEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationItemEntity';
import { IntegrationReconciliationRunEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationRunEntity';
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
  OwnerContextIsNull?: boolean;
  CreatedFrom?: Date;
  CreatedTo?: Date;
  UpdatedFrom?: Date;
  UpdatedTo?: Date;
}

export interface ReconciliationRunListFilter {
  BusinessReference?: string;
  WarehouseId?: string;
  OwnerId?: string;
  RunStatus?: string;
  CreatedFrom?: Date;
  CreatedTo?: Date;
  UpdatedFrom?: Date;
  UpdatedTo?: Date;
}

export interface ReconciliationItemListFilter {
  RunId?: string;
  ItemStatus?: string;
  Severity?: string;
  MismatchType?: string;
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
  ListInterfaceMessages(
    skip: number,
    take: number,
    filter?: IntegrationListFilter,
  ): Promise<{ Items: InterfaceMessageEntity[]; TotalItems: number }>;
  FindReconciliationRunById(id: string, manager?: EntityManager): Promise<IntegrationReconciliationRunEntity | null>;
  FindReconciliationRunByIdempotencyKey(
    idempotencyKey: string,
    businessReference: string,
    warehouseId: string,
    ownerId?: string | null,
    manager?: EntityManager,
  ): Promise<IntegrationReconciliationRunEntity | null>;
  CreateReconciliationRun(
    run: IntegrationReconciliationRunEntity,
    items: IntegrationReconciliationItemEntity[],
    manager?: EntityManager,
  ): Promise<{ Run: IntegrationReconciliationRunEntity; Items: IntegrationReconciliationItemEntity[] }>;
  UpdateReconciliationRun(
    run: IntegrationReconciliationRunEntity,
    manager?: EntityManager,
  ): Promise<IntegrationReconciliationRunEntity>;
  ListReconciliationRuns(
    skip: number,
    take: number,
    filter?: ReconciliationRunListFilter,
  ): Promise<{ Items: IntegrationReconciliationRunEntity[]; TotalItems: number }>;
  FindReconciliationItemById(
    id: string,
    manager?: EntityManager,
    options?: IntegrationReadOptions,
  ): Promise<IntegrationReconciliationItemEntity | null>;
  UpdateReconciliationItem(
    item: IntegrationReconciliationItemEntity,
    manager?: EntityManager,
  ): Promise<IntegrationReconciliationItemEntity>;
  ListReconciliationItems(
    skip: number,
    take: number,
    filter?: ReconciliationItemListFilter,
    manager?: EntityManager,
  ): Promise<{ Items: IntegrationReconciliationItemEntity[]; TotalItems: number }>;
}
