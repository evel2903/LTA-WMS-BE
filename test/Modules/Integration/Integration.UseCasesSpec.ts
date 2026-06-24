import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import {
  IReasonCodeCatalog,
  ValidateReasonInput,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import {
  IIntegrationRepository,
  IntegrationListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ImportIntegrationBatchUseCase } from '@modules/Integration/Application/UseCases/ImportIntegrationBatchUseCase';
import { GetOutboxMessageUseCase } from '@modules/Integration/Application/UseCases/GetOutboxMessageUseCase';
import { ListImportBatchesUseCase } from '@modules/Integration/Application/UseCases/ListImportBatchesUseCase';
import { ListOutboxMessagesUseCase } from '@modules/Integration/Application/UseCases/ListOutboxMessagesUseCase';
import { RecordOutboxFailureUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxFailureUseCase';
import { RecordOutboxEventUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxEventUseCase';
import { ResolveDeadLetterUseCase } from '@modules/Integration/Application/UseCases/ResolveDeadLetterUseCase';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';
import { DeadLetterActionType } from '@modules/Integration/Domain/Enums/DeadLetterActionType';

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

  public async FindOutboxMessageById(id: string): Promise<OutboxMessageEntity | null> {
    return this.OutboxMessages.find((message) => message.Id === id) ?? null;
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

  public async UpdateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    const index = this.OutboxMessages.findIndex((message) => message.Id === outboxMessage.Id);
    if (index >= 0) this.OutboxMessages[index] = outboxMessage;
    else this.OutboxMessages.push(outboxMessage);
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
        (!filter?.Status || message.Status === filter.Status) &&
        (!filter?.EventType || message.EventType === filter.EventType) &&
        (!filter?.BusinessReference || message.BusinessReference === filter.BusinessReference) &&
        (!filter?.WarehouseContext || message.WarehouseContext === filter.WarehouseContext) &&
        (!filter?.OwnerContext || message.OwnerContext === filter.OwnerContext) &&
        (!filter?.CreatedFrom || message.CreatedAt >= filter.CreatedFrom) &&
        (!filter?.CreatedTo || message.CreatedAt <= filter.CreatedTo) &&
        (!filter?.UpdatedFrom || message.UpdatedAt >= filter.UpdatedFrom) &&
        (!filter?.UpdatedTo || message.UpdatedAt <= filter.UpdatedTo),
    );
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  public async ValidateReason(input: ValidateReasonInput) {
    if (input.ReasonCode !== 'RC-V1-DEAD-LETTER-FIX') {
      throw new BusinessRuleException(`Unknown reason code: ${input.ReasonCode}`);
    }
    if (input.Action !== ActionCode.Update || input.ObjectType !== ObjectType.DeadLetterMessage) {
      throw new BusinessRuleException('Reason code does not apply');
    }
    return { ReasonCodeId: 'reason-dead-letter-fix', EvidenceRequired: true, ApprovalRequired: false };
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

  it('retries transient failure with bounded backoff and preserves trace fields', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);

    const result = await new RecordOutboxFailureUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      message.Id,
      {
        FailureCategory: IntegrationFailureCategory.Transient,
        ErrorMessage: 'ERP timeout',
      },
      ctx,
    );

    expect(result).toMatchObject({
      Id: message.Id,
      MessageId: 'msg-1',
      BusinessReference: 'IB-2026-0001',
      WarehouseContext: 'WT-01-A',
      OwnerContext: 'OWNER-A',
      Status: OutboxMessageStatus.Retrying,
      AttemptCount: 1,
      MaxAttempts: 5,
      FailureCategory: IntegrationFailureCategory.Transient,
      LastError: 'ERP timeout',
    });
    expect(result.NextRetryAt).toBeInstanceOf(Date);
    expect(repo.OutboxMessages).toHaveLength(1);
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.IntegrationMessage,
      ObjectCode: 'msg-1',
    });
  });

  it('moves validation failure to dead-letter and creates IntegrationSyncFailed trace once', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);
    const useCase = new RecordOutboxFailureUseCase(repo, audit as unknown as AuditedTransaction);

    const result = await useCase.Execute(
      message.Id,
      {
        FailureCategory: IntegrationFailureCategory.Validation,
        ErrorMessage: 'Missing owner master',
      },
      ctx,
    );
    const duplicate = await useCase.Execute(
      message.Id,
      {
        FailureCategory: IntegrationFailureCategory.Validation,
        ErrorMessage: 'Missing owner master',
      },
      ctx,
    );

    expect(result).toMatchObject({
      Status: OutboxMessageStatus.DeadLetter,
      FailureCategory: IntegrationFailureCategory.Validation,
      DeadLetterReason: 'Missing owner master',
      AttemptCount: 1,
    });
    expect(duplicate.IsDuplicate).toBe(true);
    expect(repo.OutboxMessages).toHaveLength(2);
    expect(repo.OutboxMessages[1]).toMatchObject({
      EventType: 'IntegrationSyncFailed',
      MessageId: 'msg-1:IntegrationSyncFailed',
      BusinessReference: 'IB-2026-0001',
      WarehouseContext: 'WT-01-A',
      OwnerContext: 'OWNER-A',
      Status: OutboxMessageStatus.Pending,
    });
  });

  it('creates IntegrationSyncFailed after max transient retry without losing business reference', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);
    const stored = await repo.FindOutboxMessageById(message.Id);
    stored!.MaxAttempts = 2;
    await repo.UpdateOutboxMessage(stored!);
    const useCase = new RecordOutboxFailureUseCase(repo, audit as unknown as AuditedTransaction);

    await useCase.Execute(
      message.Id,
      { FailureCategory: IntegrationFailureCategory.Transient, ErrorMessage: 'ERP down' },
      ctx,
    );
    const deadLetter = await useCase.Execute(
      message.Id,
      { FailureCategory: IntegrationFailureCategory.Transient, ErrorMessage: 'ERP down again' },
      ctx,
    );

    expect(deadLetter).toMatchObject({
      Status: OutboxMessageStatus.DeadLetter,
      FailureCategory: IntegrationFailureCategory.RetryExhausted,
      AttemptCount: 2,
      MaxAttempts: 2,
      BusinessReference: 'IB-2026-0001',
    });
    expect(repo.OutboxMessages.find((item) => item.EventType === 'IntegrationSyncFailed')).toMatchObject({
      BusinessReference: 'IB-2026-0001',
      OwnerContext: 'OWNER-A',
    });
  });

  it('blocks manual dead-letter fix without evidence and writes failed audit without state change', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);
    await new RecordOutboxFailureUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      message.Id,
      { FailureCategory: IntegrationFailureCategory.Validation, ErrorMessage: 'Invalid payload' },
      ctx,
    );
    const before = await repo.FindOutboxMessageById(message.Id);

    await expect(
      new ResolveDeadLetterUseCase(repo, new FakeReasonCatalog(), audit as unknown as AuditedTransaction).Execute(
        message.Id,
        DeadLetterActionType.ManualFix,
        { ReasonCode: 'RC-V1-DEAD-LETTER-FIX', EvidenceRefs: [] },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const after = await repo.FindOutboxMessageById(message.Id);
    expect(after?.Status).toBe(before?.Status);
    expect(after?.ResolutionAction).toBeNull();
    expect(audit.Entries[audit.Entries.length - 1]).toMatchObject({
      ObjectType: ObjectType.DeadLetterMessage,
      Result: 'FAILED',
    });
  });

  it('manual retry updates dead-letter with reason/evidence audit and is action-idempotent', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);
    await new RecordOutboxFailureUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      message.Id,
      { FailureCategory: IntegrationFailureCategory.Validation, ErrorMessage: 'Invalid payload' },
      ctx,
    );
    const useCase = new ResolveDeadLetterUseCase(repo, new FakeReasonCatalog(), audit as unknown as AuditedTransaction);

    const result = await useCase.Execute(
      message.Id,
      DeadLetterActionType.Retry,
      {
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:INT-1'],
        IdempotencyKey: 'retry-1',
      },
      ctx,
    );
    const duplicate = await useCase.Execute(
      message.Id,
      DeadLetterActionType.Retry,
      {
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:INT-1'],
        IdempotencyKey: 'retry-1',
      },
      ctx,
    );

    expect(result).toMatchObject({
      Status: OutboxMessageStatus.Pending,
      ResolutionAction: DeadLetterActionType.Retry,
      AttemptCount: 0,
      MaxAttempts: 5,
      FailureCategory: null,
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:INT-1'],
    });
    expect(duplicate.IsDuplicate).toBe(true);
    expect(audit.Entries[audit.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.DeadLetterMessage,
      ReasonCodeId: 'reason-dead-letter-fix',
      EvidenceRefs: ['ticket:INT-1'],
    });

    await expect(
      useCase.Execute(
        message.Id,
        DeadLetterActionType.Retry,
        {
          ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
          EvidenceRefs: ['ticket:INT-CHANGED'],
          IdempotencyKey: 'retry-1',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.Entries[audit.Entries.length - 1]).toMatchObject({
      ObjectType: ObjectType.DeadLetterMessage,
      Result: 'FAILED',
    });
  });

  it('rejects dead-letter action before message is actually dead-lettered', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);
    await new RecordOutboxFailureUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      message.Id,
      { FailureCategory: IntegrationFailureCategory.Transient, ErrorMessage: 'ERP timeout' },
      ctx,
    );

    await expect(
      new ResolveDeadLetterUseCase(repo, new FakeReasonCatalog(), audit as unknown as AuditedTransaction).Execute(
        message.Id,
        DeadLetterActionType.Ignore,
        { ReasonCode: 'RC-V1-DEAD-LETTER-FIX', EvidenceRefs: ['ticket:INT-2'] },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const after = await repo.FindOutboxMessageById(message.Id);
    expect(after?.Status).toBe(OutboxMessageStatus.Retrying);
    expect(after?.ResolutionAction).toBeNull();
    expect(audit.Entries[audit.Entries.length - 1]).toMatchObject({
      ObjectType: ObjectType.DeadLetterMessage,
      Result: 'FAILED',
    });
  });

  it('acknowledges dead-letter with reason/evidence audit path', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);
    await new RecordOutboxFailureUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      message.Id,
      { FailureCategory: IntegrationFailureCategory.Validation, ErrorMessage: 'Invalid payload' },
      ctx,
    );

    const result = await new ResolveDeadLetterUseCase(
      repo,
      new FakeReasonCatalog(),
      audit as unknown as AuditedTransaction,
    ).Execute(
      message.Id,
      DeadLetterActionType.Acknowledge,
      { ReasonCode: 'RC-V1-DEAD-LETTER-FIX', EvidenceRefs: ['ticket:ACK-1'], IdempotencyKey: 'ack-1' },
      ctx,
    );

    expect(result).toMatchObject({
      Status: OutboxMessageStatus.Acknowledged,
      ResolutionAction: DeadLetterActionType.Acknowledge,
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:ACK-1'],
    });
    expect(audit.Entries[audit.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.DeadLetterMessage,
      ReasonCodeId: 'reason-dead-letter-fix',
      EvidenceRefs: ['ticket:ACK-1'],
    });
  });

  it('hides non-dead-letter messages from dead-letter detail reads', async () => {
    const repo = new FakeIntegrationRepository();
    const message = await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);

    await expect(
      new GetOutboxMessageUseCase(repo).Execute(message.Id, new Set([OutboxMessageStatus.DeadLetter])),
    ).rejects.toThrow('Integration outbox message not found');
  });

  it('clamps outbox/dead-letter list PageSize to 100 and filters event type and updated time', async () => {
    const repo = new FakeIntegrationRepository();
    await new RecordOutboxEventUseCase(repo).Execute(envelope, ctx);
    await new RecordOutboxEventUseCase(repo).Execute(
      { ...envelope, MessageId: 'msg-2', MessageType: 'GoodsIssuePosted' },
      ctx,
    );

    repo.OutboxMessages[0].UpdatedAt = new Date('2026-06-22T07:00:00.000Z');
    repo.OutboxMessages[1].UpdatedAt = new Date('2026-06-22T09:00:00.000Z');

    const page = await new ListOutboxMessagesUseCase(repo).Execute({
      PageSize: 500,
      EventType: 'GoodsIssuePosted',
      UpdatedFrom: '2026-06-22T08:00:00.000Z',
      UpdatedTo: '2026-06-22T10:00:00.000Z',
    });

    expect(page.Meta.PageSize).toBe(100);
    expect(page.Items).toHaveLength(1);
    expect(page.Items[0].EventType).toBe('GoodsIssuePosted');
  });
});
