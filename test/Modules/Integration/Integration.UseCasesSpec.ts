import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import {
  IIntegrationRepository,
  IntegrationListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ImportIntegrationBatchUseCase } from '@modules/Integration/Application/UseCases/ImportIntegrationBatchUseCase';
import { ListImportBatchesUseCase } from '@modules/Integration/Application/UseCases/ListImportBatchesUseCase';
import { RecordOutboxEventUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxEventUseCase';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

class FakeIntegrationRepository implements IIntegrationRepository {
  public readonly ImportBatches: ImportBatchEntity[] = [];
  public readonly InterfaceMessages: InterfaceMessageEntity[] = [];
  public readonly OutboxMessages: OutboxMessageEntity[] = [];

  public async FindInterfaceMessageByMessageId(messageId: string): Promise<InterfaceMessageEntity | null> {
    return this.InterfaceMessages.find((message) => message.MessageId === messageId) ?? null;
  }

  public async FindOutboxMessageByMessageId(messageId: string): Promise<OutboxMessageEntity | null> {
    return this.OutboxMessages.find((message) => message.MessageId === messageId) ?? null;
  }

  public async CreateImport(
    importBatch: ImportBatchEntity,
    interfaceMessages: InterfaceMessageEntity[],
    outboxMessages: OutboxMessageEntity[],
  ): Promise<{
    ImportBatch: ImportBatchEntity;
    InterfaceMessages: InterfaceMessageEntity[];
    OutboxMessages: OutboxMessageEntity[];
  }> {
    this.ImportBatches.push(importBatch);
    this.InterfaceMessages.push(...interfaceMessages);
    this.OutboxMessages.push(...outboxMessages);
    return { ImportBatch: importBatch, InterfaceMessages: interfaceMessages, OutboxMessages: outboxMessages };
  }

  public async CreateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.OutboxMessages.push(outboxMessage);
    return outboxMessage;
  }

  public async ListImportBatches(
    skip: number,
    take: number,
    filter?: IntegrationListFilter,
  ): Promise<{ Items: ImportBatchEntity[]; TotalItems: number }> {
    const items = this.ImportBatches.filter(
      (batch) =>
        (!filter?.SourceSystem || batch.SourceSystem === filter.SourceSystem) &&
        (!filter?.Status || batch.Status === filter.Status),
    );
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }

  public async ListOutboxMessages(
    skip: number,
    take: number,
    filter?: IntegrationListFilter,
  ): Promise<{ Items: OutboxMessageEntity[]; TotalItems: number }> {
    const items = this.OutboxMessages.filter(
      (message) =>
        (!filter?.SourceSystem || message.SourceSystem === filter.SourceSystem) &&
        (!filter?.Status || message.Status === filter.Status),
    );
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

const ctx: AuditContext = {
  ActorUserId: 'u1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const envelope = {
  MessageId: 'msg-1',
  MessageType: 'InboundPlanReceived',
  Version: '1.0',
  BusinessReference: 'IB-2026-0001',
  SourceSystem: 'ERP',
  TargetSystem: 'LTA-WMS',
  WarehouseContext: 'WT-01-A',
  OwnerContext: 'OWNER-A',
  EventTime: new Date('2026-06-22T08:00:00.000Z'),
  CorrelationId: 'corr-import-1',
  CausationId: 'cause-import-1',
  Payload: { inboundPlanNo: 'IB-2026-0001' },
};

describe('Integration use cases', () => {
  it('rejects missing messageId before persistence and audit', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();

    await expect(
      new ImportIntegrationBatchUseCase(repo, audit as unknown as AuditedTransaction).Execute(
        {
          BatchReference: 'BATCH-1',
          Messages: [{ ...envelope, MessageId: '' }],
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(repo.ImportBatches).toHaveLength(0);
    expect(repo.InterfaceMessages).toHaveLength(0);
    expect(repo.OutboxMessages).toHaveLength(0);
    expect(audit.Entries).toHaveLength(0);
  });

  it('stores import batch, interface message and outbox event with trace fields', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();

    const result = await new ImportIntegrationBatchUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      {
        BatchReference: 'BATCH-1',
        Messages: [envelope],
      },
      ctx,
    );

    expect(result.ImportBatch.Status).toBe(ImportBatchStatus.Completed);
    expect(result.ImportBatch.AcceptedCount).toBe(1);
    expect(result.Messages[0]).toMatchObject({
      MessageId: 'msg-1',
      MessageType: 'InboundPlanReceived',
      BusinessReference: 'IB-2026-0001',
      WarehouseContext: 'WT-01-A',
      OwnerContext: 'OWNER-A',
      MessageStatus: InterfaceMessageStatus.Accepted,
      IsDuplicate: false,
    });
    expect(result.OutboxMessages[0]).toMatchObject({
      MessageId: 'msg-1',
      EventType: 'InboundPlanReceived',
      BusinessReference: 'IB-2026-0001',
      WarehouseContext: 'WT-01-A',
      OwnerContext: 'OWNER-A',
      Status: OutboxMessageStatus.Pending,
    });
    expect(repo.InterfaceMessages).toHaveLength(1);
    expect(repo.OutboxMessages).toHaveLength(1);
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.IntegrationMessage,
      ObjectCode: 'BATCH-1',
    });
  });

  it('acknowledges duplicate message without creating a second interface message or outbox event', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const useCase = new ImportIntegrationBatchUseCase(repo, audit as unknown as AuditedTransaction);

    await useCase.Execute({ BatchReference: 'BATCH-1', Messages: [envelope] }, ctx);
    const duplicate = await useCase.Execute({ BatchReference: 'BATCH-2', Messages: [envelope] }, ctx);

    expect(duplicate.ImportBatch.Status).toBe(ImportBatchStatus.DuplicateOnly);
    expect(duplicate.ImportBatch.DuplicateCount).toBe(1);
    expect(duplicate.Messages[0]).toMatchObject({
      MessageId: 'msg-1',
      IsDuplicate: true,
    });
    expect(repo.InterfaceMessages).toHaveLength(1);
    expect(repo.OutboxMessages).toHaveLength(1);
  });

  it('deduplicates repeated messageId inside the same import batch before persistence', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();

    const result = await new ImportIntegrationBatchUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      {
        BatchReference: 'BATCH-1',
        Messages: [envelope, { ...envelope }],
      },
      ctx,
    );

    expect(result.ImportBatch.AcceptedCount).toBe(1);
    expect(result.ImportBatch.DuplicateCount).toBe(1);
    expect(result.Messages).toHaveLength(2);
    expect(result.Messages.filter((message) => message.IsDuplicate)).toHaveLength(1);
    expect(repo.InterfaceMessages).toHaveLength(1);
    expect(repo.OutboxMessages).toHaveLength(1);
  });

  it('records direct outbox event with pending dispatch status and idempotent duplicate ack', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const useCase = new RecordOutboxEventUseCase(repo, audit as unknown as AuditedTransaction);

    const first = await useCase.Execute(envelope, ctx);
    const duplicate = await useCase.Execute(envelope, ctx);

    expect(first).toMatchObject({
      MessageId: 'msg-1',
      EventType: 'InboundPlanReceived',
      Status: OutboxMessageStatus.Pending,
      IsDuplicate: false,
    });
    expect(duplicate).toMatchObject({
      MessageId: 'msg-1',
      IsDuplicate: true,
    });
    expect(repo.OutboxMessages).toHaveLength(1);
    await expect(
      useCase.Execute({ ...envelope, Payload: { inboundPlanNo: 'IB-CHANGED' } }, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.IntegrationMessage,
      ObjectCode: 'msg-1',
    });
  });

  it('clamps import list PageSize to 100 and defaults to 50', async () => {
    const repo = new FakeIntegrationRepository();
    await new ImportIntegrationBatchUseCase(repo).Execute({ BatchReference: 'BATCH-1', Messages: [envelope] }, ctx);

    const defaultPage = await new ListImportBatchesUseCase(repo).Execute({});
    const clampedPage = await new ListImportBatchesUseCase(repo).Execute({ PageSize: 500 });

    expect(defaultPage.Meta.PageSize).toBe(50);
    expect(clampedPage.Meta.PageSize).toBe(100);
  });
});
