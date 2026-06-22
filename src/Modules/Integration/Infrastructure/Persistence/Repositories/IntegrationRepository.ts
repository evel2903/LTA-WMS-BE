import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import {
  IIntegrationRepository,
  IntegrationListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IntegrationOrmMapper } from '@modules/Integration/Infrastructure/Mappers/IntegrationOrmMapper';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';

@Injectable()
export class IntegrationRepository implements IIntegrationRepository {
  constructor(
    @InjectRepository(ImportBatchOrmEntity)
    private readonly importBatches: Repository<ImportBatchOrmEntity>,
    @InjectRepository(InterfaceMessageOrmEntity)
    private readonly interfaceMessages: Repository<InterfaceMessageOrmEntity>,
    @InjectRepository(OutboxMessageOrmEntity)
    private readonly outboxMessages: Repository<OutboxMessageOrmEntity>,
  ) {}

  public async FindInterfaceMessageByMessageId(messageId: string): Promise<InterfaceMessageEntity | null> {
    const entity = await this.interfaceMessages.findOne({ where: { MessageId: messageId } });
    return entity ? IntegrationOrmMapper.ToInterfaceMessageDomain(entity) : null;
  }

  public async FindOutboxMessageByMessageId(messageId: string): Promise<OutboxMessageEntity | null> {
    const entity = await this.outboxMessages.findOne({ where: { MessageId: messageId } });
    return entity ? IntegrationOrmMapper.ToOutboxMessageDomain(entity) : null;
  }

  public async CreateImport(
    importBatch: ImportBatchEntity,
    interfaceMessages: InterfaceMessageEntity[],
    outboxMessages: OutboxMessageEntity[],
    manager?: EntityManager,
  ): Promise<{
    ImportBatch: ImportBatchEntity;
    InterfaceMessages: InterfaceMessageEntity[];
    OutboxMessages: OutboxMessageEntity[];
  }> {
    const batchRepo = manager ? manager.getRepository(ImportBatchOrmEntity) : this.importBatches;
    const interfaceRepo = manager ? manager.getRepository(InterfaceMessageOrmEntity) : this.interfaceMessages;
    const outboxRepo = manager ? manager.getRepository(OutboxMessageOrmEntity) : this.outboxMessages;
    try {
      const savedBatch = await batchRepo.save(IntegrationOrmMapper.ToImportBatchOrm(importBatch));
      const savedMessages = interfaceMessages.length
        ? await interfaceRepo.save(interfaceMessages.map(IntegrationOrmMapper.ToInterfaceMessageOrm))
        : [];
      const savedOutbox = outboxMessages.length
        ? await outboxRepo.save(outboxMessages.map(IntegrationOrmMapper.ToOutboxMessageOrm))
        : [];
      return {
        ImportBatch: IntegrationOrmMapper.ToImportBatchDomain(savedBatch),
        InterfaceMessages: savedMessages.map(IntegrationOrmMapper.ToInterfaceMessageDomain),
        OutboxMessages: savedOutbox.map(IntegrationOrmMapper.ToOutboxMessageDomain),
      };
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async CreateOutboxMessage(
    outboxMessage: OutboxMessageEntity,
    manager?: EntityManager,
  ): Promise<OutboxMessageEntity> {
    const repo = manager ? manager.getRepository(OutboxMessageOrmEntity) : this.outboxMessages;
    try {
      const saved = await repo.save(IntegrationOrmMapper.ToOutboxMessageOrm(outboxMessage));
      return IntegrationOrmMapper.ToOutboxMessageDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async ListImportBatches(
    skip: number,
    take: number,
    filter: IntegrationListFilter = {},
  ): Promise<{ Items: ImportBatchEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<ImportBatchOrmEntity> = {};
    if (filter.SourceSystem) where.SourceSystem = filter.SourceSystem;
    if (filter.Status) where.Status = filter.Status;
    const [items, total] = await this.importBatches.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(IntegrationOrmMapper.ToImportBatchDomain), TotalItems: total };
  }

  public async ListOutboxMessages(
    skip: number,
    take: number,
    filter: IntegrationListFilter = {},
  ): Promise<{ Items: OutboxMessageEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<OutboxMessageOrmEntity> = {};
    if (filter.SourceSystem) where.SourceSystem = filter.SourceSystem;
    if (filter.Status) where.Status = filter.Status;
    if (filter.BusinessReference) where.BusinessReference = filter.BusinessReference;
    if (filter.WarehouseContext) where.WarehouseContext = filter.WarehouseContext;
    if (filter.OwnerContext) where.OwnerContext = filter.OwnerContext;
    const [items, total] = await this.outboxMessages.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(IntegrationOrmMapper.ToOutboxMessageDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Integration message unique constraint violated');
    }
  }
}
