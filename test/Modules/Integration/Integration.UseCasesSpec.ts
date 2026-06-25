import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import {
  IReasonCodeCatalog,
  ValidateReasonInput,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import {
  IIntegrationRepository,
  IntegrationListFilter,
  ReconciliationItemListFilter,
  ReconciliationRunListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ImportIntegrationBatchUseCase } from '@modules/Integration/Application/UseCases/ImportIntegrationBatchUseCase';
import { GetOutboxMessageUseCase } from '@modules/Integration/Application/UseCases/GetOutboxMessageUseCase';
import { ListImportBatchesUseCase } from '@modules/Integration/Application/UseCases/ListImportBatchesUseCase';
import { ListOutboxMessagesUseCase } from '@modules/Integration/Application/UseCases/ListOutboxMessagesUseCase';
import { RecordOutboxFailureUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxFailureUseCase';
import { RecordOutboxEventUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxEventUseCase';
import {
  CreateReconciliationRunUseCase,
  ListReconciliationItemsUseCase,
  ListReconciliationRunsUseCase,
  ResolveReconciliationItemUseCase,
} from '@modules/Integration/Application/UseCases/ReconciliationUseCases';
import { ResolveDeadLetterUseCase } from '@modules/Integration/Application/UseCases/ResolveDeadLetterUseCase';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import { IntegrationReconciliationItemEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationItemEntity';
import { IntegrationReconciliationRunEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationRunEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';
import { DeadLetterActionType } from '@modules/Integration/Domain/Enums/DeadLetterActionType';
import { IntegrationReconciliationItemStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationItemStatus';
import { IntegrationReconciliationRunStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationRunStatus';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';

class FakeIntegrationRepository implements IIntegrationRepository {
  public readonly ImportBatches: ImportBatchEntity[] = [];
  public readonly InterfaceMessages: InterfaceMessageEntity[] = [];
  public readonly OutboxMessages: OutboxMessageEntity[] = [];
  public readonly ReconciliationRuns: IntegrationReconciliationRunEntity[] = [];
  public readonly ReconciliationItems: IntegrationReconciliationItemEntity[] = [];

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
        (!filter?.OwnerContextIsNull || message.OwnerContext === null) &&
        (!filter?.CreatedFrom || message.CreatedAt >= filter.CreatedFrom) &&
        (!filter?.CreatedTo || message.CreatedAt <= filter.CreatedTo) &&
        (!filter?.UpdatedFrom || message.UpdatedAt >= filter.UpdatedFrom) &&
        (!filter?.UpdatedTo || message.UpdatedAt <= filter.UpdatedTo),
    );
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }

  public async ListInterfaceMessages(
    skip: number,
    take: number,
    filter?: IntegrationListFilter,
  ): Promise<{ Items: InterfaceMessageEntity[]; TotalItems: number }> {
    const items = this.InterfaceMessages.filter(
      (message) =>
        (!filter?.SourceSystem || message.SourceSystem === filter.SourceSystem) &&
        (!filter?.BusinessReference || message.BusinessReference === filter.BusinessReference) &&
        (!filter?.WarehouseContext || message.WarehouseContext === filter.WarehouseContext) &&
        (!filter?.OwnerContext || message.OwnerContext === filter.OwnerContext) &&
        (!filter?.OwnerContextIsNull || message.OwnerContext === null) &&
        (!filter?.CreatedFrom || message.CreatedAt >= filter.CreatedFrom) &&
        (!filter?.CreatedTo || message.CreatedAt <= filter.CreatedTo),
    );
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }

  public async FindReconciliationRunById(id: string): Promise<IntegrationReconciliationRunEntity | null> {
    return this.ReconciliationRuns.find((run) => run.Id === id) ?? null;
  }

  public async FindReconciliationRunByIdempotencyKey(
    idempotencyKey: string,
    businessReference: string,
    warehouseId: string,
    ownerId?: string | null,
  ): Promise<IntegrationReconciliationRunEntity | null> {
    return (
      this.ReconciliationRuns.find(
        (run) =>
          run.IdempotencyKey === idempotencyKey &&
          run.BusinessReference === businessReference &&
          run.WarehouseId === warehouseId &&
          run.OwnerId === (ownerId ?? null),
      ) ?? null
    );
  }

  public async CreateReconciliationRun(
    run: IntegrationReconciliationRunEntity,
    items: IntegrationReconciliationItemEntity[],
  ): Promise<{ Run: IntegrationReconciliationRunEntity; Items: IntegrationReconciliationItemEntity[] }> {
    this.ReconciliationRuns.push(run);
    this.ReconciliationItems.push(...items);
    return { Run: run, Items: items };
  }

  public async UpdateReconciliationRun(
    run: IntegrationReconciliationRunEntity,
  ): Promise<IntegrationReconciliationRunEntity> {
    const index = this.ReconciliationRuns.findIndex((item) => item.Id === run.Id);
    if (index >= 0) this.ReconciliationRuns[index] = run;
    else this.ReconciliationRuns.push(run);
    return run;
  }

  public async ListReconciliationRuns(
    skip: number,
    take: number,
    filter?: ReconciliationRunListFilter,
  ): Promise<{ Items: IntegrationReconciliationRunEntity[]; TotalItems: number }> {
    const items = this.ReconciliationRuns.filter(
      (run) =>
        (!filter?.BusinessReference || run.BusinessReference === filter.BusinessReference) &&
        (!filter?.WarehouseId || run.WarehouseId === filter.WarehouseId) &&
        (!filter?.OwnerId || run.OwnerId === filter.OwnerId) &&
        (!filter?.RunStatus || run.RunStatus === filter.RunStatus) &&
        (!filter?.CreatedFrom || run.CreatedAt >= filter.CreatedFrom) &&
        (!filter?.CreatedTo || run.CreatedAt <= filter.CreatedTo) &&
        (!filter?.UpdatedFrom || run.UpdatedAt >= filter.UpdatedFrom) &&
        (!filter?.UpdatedTo || run.UpdatedAt <= filter.UpdatedTo),
    );
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }

  public async FindReconciliationItemById(id: string): Promise<IntegrationReconciliationItemEntity | null> {
    return this.ReconciliationItems.find((item) => item.Id === id) ?? null;
  }

  public async UpdateReconciliationItem(
    item: IntegrationReconciliationItemEntity,
  ): Promise<IntegrationReconciliationItemEntity> {
    const index = this.ReconciliationItems.findIndex((existing) => existing.Id === item.Id);
    if (index >= 0) this.ReconciliationItems[index] = item;
    else this.ReconciliationItems.push(item);
    return item;
  }

  public async ListReconciliationItems(
    skip: number,
    take: number,
    filter?: ReconciliationItemListFilter,
  ): Promise<{ Items: IntegrationReconciliationItemEntity[]; TotalItems: number }> {
    const items = this.ReconciliationItems.filter(
      (item) =>
        (!filter?.RunId || item.RunId === filter.RunId) &&
        (!filter?.ItemStatus || item.ItemStatus === filter.ItemStatus) &&
        (!filter?.Severity || item.Severity === filter.Severity) &&
        (!filter?.MismatchType || item.MismatchType === filter.MismatchType) &&
        (!filter?.CreatedFrom || item.CreatedAt >= filter.CreatedFrom) &&
        (!filter?.CreatedTo || item.CreatedAt <= filter.CreatedTo) &&
        (!filter?.UpdatedFrom || item.UpdatedAt >= filter.UpdatedFrom) &&
        (!filter?.UpdatedTo || item.UpdatedAt <= filter.UpdatedTo),
    );
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  public async ValidateReason(input: ValidateReasonInput) {
    if (input.ReasonCode !== 'RC-V1-DEAD-LETTER-FIX') {
      throw new BusinessRuleException(`Unknown reason code: ${input.ReasonCode}`);
    }
    if (
      input.Action !== ActionCode.Update ||
      ![ObjectType.DeadLetterMessage, ObjectType.ReconciliationRun].includes(input.ObjectType)
    ) {
      throw new BusinessRuleException('Reason code does not apply');
    }
    return { ReasonCodeId: 'reason-dead-letter-fix', EvidenceRequired: true, ApprovalRequired: false };
  }
}

class FakeExceptionCaseRepository implements IExceptionCaseRepository {
  public readonly Cases: ExceptionCaseEntity[] = [];

  public async FindById(id: string): Promise<ExceptionCaseEntity | null> {
    return this.Cases.find((item) => item.Id === id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<ExceptionCaseEntity | null> {
    return this.FindById(id);
  }

  public async Create(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    this.Cases.push(entity);
    return entity;
  }

  public async Update(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    const index = this.Cases.findIndex((item) => item.Id === entity.Id);
    if (index >= 0) this.Cases[index] = entity;
    else this.Cases.push(entity);
    return entity;
  }

  public async List(skip: number, take: number): Promise<{ Items: ExceptionCaseEntity[]; TotalItems: number }> {
    return { Items: this.Cases.slice(skip, skip + take), TotalItems: this.Cases.length };
  }
}

class FakeApprovalRequestRepository implements IApprovalRequestRepository {
  public readonly Requests = new Map<string, ApprovalRequestEntity>();

  public async FindById(id: string): Promise<ApprovalRequestEntity | null> {
    return this.Requests.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<ApprovalRequestEntity | null> {
    return this.FindById(id);
  }

  public async Create(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.Requests.set(request.Id, request);
    return request;
  }

  public async Update(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.Requests.set(request.Id, request);
    return request;
  }

  public async List(skip = 0, take = 100): Promise<{ Items: ApprovalRequestEntity[]; TotalItems: number }> {
    const items = [...this.Requests.values()];
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

const approvedReconciliationApproval = (runId: string, overrides: Partial<ApprovalRequestEntity> = {}) =>
  new ApprovalRequestEntity({
    Id: 'approval-recon-approved',
    RequesterUserId: 'requester-1',
    Action: ActionCode.Update,
    TargetObjectType: ObjectType.ReconciliationRun,
    TargetObjectId: runId,
    TargetObjectCode: 'IB-2026-0001',
    Scope: { WarehouseId: 'WT-01-A', OwnerId: 'OWNER-A' },
    Decision: ApprovalDecision.Approved,
    DecidedByUserId: 'approver-1',
    DecidedAt: new Date('2026-06-25T00:00:00.000Z'),
    CreatedAt: new Date('2026-06-25T00:00:00.000Z'),
    UpdatedAt: new Date('2026-06-25T00:00:00.000Z'),
    CreatedBy: 'requester-1',
    UpdatedBy: 'approver-1',
    ...overrides,
  });

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

  it('creates separate reconciliation runs for the same BusinessReference in different warehouses', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    const useCase = new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    );
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-msg-wt01',
        WarehouseContext: 'WT-01-A',
        Payload: { ExpectedQuantity: 10, ActualQuantity: 8 },
      },
      ctx,
    );
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-msg-wt05',
        WarehouseContext: 'WT-05-A',
        Payload: { ExpectedQuantity: 10, ActualQuantity: 9 },
      },
      ctx,
    );

    const first = await useCase.Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-1'],
        IdempotencyKey: 'same-key',
      },
      ctx,
    );
    const second = await useCase.Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-05-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-2'],
        IdempotencyKey: 'same-key',
      },
      ctx,
    );

    expect(first.Run.Id).not.toBe(second.Run.Id);
    expect(first.Run.WarehouseId).toBe('WT-01-A');
    expect(second.Run.WarehouseId).toBe('WT-05-A');
    expect(repo.ReconciliationRuns).toHaveLength(2);
  });

  it('filters reconciliation source by WT-05 owner and creates mismatch item plus exception without outbox mutation', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-owner-a',
        WarehouseContext: 'WT-05-A',
        OwnerContext: 'OWNER-A',
        Payload: { ExpectedQuantity: 12, ActualQuantity: 10 },
      },
      ctx,
    );
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-owner-b',
        WarehouseContext: 'WT-05-A',
        OwnerContext: 'OWNER-B',
        Payload: { ExpectedQuantity: 12, ActualQuantity: 7 },
      },
      ctx,
    );

    const result = await new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    ).Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-05-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:WT05-OWNER-A'],
        IdempotencyKey: 'wt05-owner-a',
      },
      ctx,
    );

    expect(result.Run.SourceCounts.OutboxMessages).toBe(1);
    expect(result.Items).toHaveLength(1);
    expect(result.Items[0]).toMatchObject({
      MismatchType: 'QuantityMismatch',
      SourceId: 'recon-owner-a',
      ItemStatus: IntegrationReconciliationItemStatus.Open,
    });
    expect(exceptions.Cases).toHaveLength(1);
    expect(repo.OutboxMessages.find((message) => message.MessageId === 'recon-owner-a')?.Status).toBe(
      OutboxMessageStatus.Pending,
    );
  });

  it('scans all outbox pages and creates one mismatch item per scoped source mismatch', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    for (let index = 0; index < 101; index += 1) {
      await new RecordOutboxEventUseCase(repo).Execute(
        {
          ...envelope,
          MessageId: `recon-page-${index}`,
          Payload: { ExpectedQuantity: index + 1, ActualQuantity: index },
        },
        ctx,
      );
    }

    const result = await new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    ).Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-PAGE'],
        IdempotencyKey: 'recon-page-scan',
      },
      ctx,
    );

    expect(result.Run.SourceCounts.OutboxMessages).toBe(101);
    expect(result.Run.SourceCounts.QuantityMismatches).toBe(101);
    expect(result.Items).toHaveLength(101);
    expect(exceptions.Cases).toHaveLength(101);
  });

  it('creates a missing-outbox item for scoped interface messages without matching outbox', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    repo.InterfaceMessages.push(
      new InterfaceMessageEntity({
        Id: 'interface-missing-outbox-id',
        MessageId: 'interface-missing-outbox',
        MessageType: 'InboundPlanReceived',
        Version: '1.0',
        BusinessReference: envelope.BusinessReference,
        SourceSystem: 'ERP',
        TargetSystem: 'LTA-WMS',
        WarehouseContext: 'WT-01-A',
        OwnerContext: 'OWNER-A',
        EventTime: new Date('2026-06-25T00:00:00.000Z'),
        Payload: { ExpectedQuantity: 5 },
        MessageStatus: InterfaceMessageStatus.Accepted,
        CreatedAt: new Date('2026-06-25T00:00:00.000Z'),
      }),
    );

    const result = await new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    ).Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-INTERFACE'],
        IdempotencyKey: 'recon-interface',
      },
      ctx,
    );

    expect(result.Run.SourceCounts.InterfaceMessages).toBe(1);
    expect(result.Run.SourceCounts.MissingOutboxMessages).toBe(1);
    expect(result.Items[0]).toMatchObject({
      MismatchType: 'MissingOutboxMessage',
      SourceType: 'InterfaceMessage',
      SourceId: 'interface-missing-outbox',
    });
  });

  it('handles reconciliation idempotent duplicate and conflicting payloads by scope', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-idempotent-source',
        Payload: { ExpectedStatus: 'Pending', ActualStatus: 'Failed' },
      },
      ctx,
    );
    const useCase = new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    );

    const first = await useCase.Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-IDEMP'],
        IdempotencyKey: 'recon-idempotent',
      },
      ctx,
    );
    const duplicate = await useCase.Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-IDEMP'],
        IdempotencyKey: 'recon-idempotent',
      },
      ctx,
    );

    expect(duplicate.Run.Id).toBe(first.Run.Id);
    expect(duplicate.Run.IsDuplicate).toBe(true);
    await expect(
      useCase.Execute(
        {
          BusinessReference: envelope.BusinessReference,
          WarehouseId: 'WT-01-A',
          OwnerId: 'OWNER-A',
          ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
          EvidenceRefs: ['ticket:RECON-CHANGED'],
          IdempotencyKey: 'recon-idempotent',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks reconciliation create without evidence and manual resolution with inventory impact without approval', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-block-source',
        Payload: { ExpectedQuantity: 1, ActualQuantity: 0 },
      },
      ctx,
    );
    const createRun = new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    );

    await expect(
      createRun.Execute(
        {
          BusinessReference: envelope.BusinessReference,
          WarehouseId: 'WT-01-A',
          OwnerId: 'OWNER-A',
          ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
          EvidenceRefs: [],
          IdempotencyKey: 'recon-missing-evidence',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const run = await createRun.Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-BLOCK'],
        IdempotencyKey: 'recon-block',
      },
      ctx,
    );
    const itemId = run.Items[0].Id;

    await expect(
      new ResolveReconciliationItemUseCase(
        repo,
        new FakeReasonCatalog(),
        new FakeApprovalRequestRepository(),
        audit as unknown as AuditedTransaction,
      ).Execute(
        itemId,
        {
          ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
          EvidenceRefs: ['ticket:RECON-BLOCK'],
          IdempotencyKey: 'resolve-block',
          ResolutionNote: 'Would need inventory adjustment',
          ImpactsInventory: true,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(repo.ReconciliationItems[0].ItemStatus).toBe(IntegrationReconciliationItemStatus.Open);
    expect(audit.Entries[audit.Entries.length - 1]).toMatchObject({
      ObjectType: ObjectType.ReconciliationRun,
      Result: 'FAILED',
    });
  });

  it('blocks inventory-impact reconciliation resolution when approval is not approved for the run', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const approvals = new FakeApprovalRequestRepository();
    const exceptions = new FakeExceptionCaseRepository();
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-approval-source',
        Payload: { ExpectedQuantity: 1, ActualQuantity: 0 },
      },
      ctx,
    );
    const run = await new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    ).Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-APPROVAL'],
        IdempotencyKey: 'recon-approval',
      },
      ctx,
    );
    await approvals.Create(approvedReconciliationApproval('another-run'));

    await expect(
      new ResolveReconciliationItemUseCase(
        repo,
        new FakeReasonCatalog(),
        approvals,
        audit as unknown as AuditedTransaction,
      ).Execute(
        run.Items[0].Id,
        {
          ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
          EvidenceRefs: ['ticket:RECON-APPROVAL'],
          IdempotencyKey: 'resolve-approval',
          ResolutionNote: 'Would need inventory impact',
          ImpactsInventory: true,
          ApprovalRequestId: 'approval-recon-approved',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(repo.ReconciliationItems[0].ItemStatus).toBe(IntegrationReconciliationItemStatus.Open);
  });

  it('clamps reconciliation run and item PageSize to 100 and marks run resolved after item resolution', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-resolve-source',
        Payload: { ExpectedStatus: 'Pending', ActualStatus: 'DeadLetter' },
      },
      ctx,
    );
    const run = await new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    ).Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-RESOLVE'],
        IdempotencyKey: 'recon-resolve',
      },
      ctx,
    );

    const runsPage = await new ListReconciliationRunsUseCase(repo).Execute({ PageSize: 500 });
    const itemsPage = await new ListReconciliationItemsUseCase(repo).Execute(run.Run.Id, { PageSize: 500 });
    const wrongScopeItems = await new ListReconciliationItemsUseCase(repo).Execute(run.Run.Id, {
      WarehouseId: 'WT-05-A',
      PageSize: 50,
    });
    const futureItems = await new ListReconciliationItemsUseCase(repo).Execute(run.Run.Id, {
      CreatedFrom: new Date('2030-01-01T00:00:00.000Z'),
      PageSize: 50,
    });
    const resolved = await new ResolveReconciliationItemUseCase(
      repo,
      new FakeReasonCatalog(),
      new FakeApprovalRequestRepository(),
      audit as unknown as AuditedTransaction,
    ).Execute(
      run.Items[0].Id,
      {
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-RESOLVE'],
        IdempotencyKey: 'resolve-recon',
        ResolutionNote: 'External document fixed',
      },
      ctx,
    );

    expect(runsPage.Meta.PageSize).toBe(100);
    expect(itemsPage.Meta.PageSize).toBe(100);
    expect(wrongScopeItems.Items).toHaveLength(0);
    expect(futureItems.Items).toHaveLength(0);
    expect(resolved.ItemStatus).toBe(IntegrationReconciliationItemStatus.Resolved);
    expect(repo.ReconciliationRuns[0].RunStatus).toBe(IntegrationReconciliationRunStatus.Resolved);
  });

  it('keeps reconciliation run open when another item remains unresolved', async () => {
    const repo = new FakeIntegrationRepository();
    const audit = new StubAuditedTransaction();
    const exceptions = new FakeExceptionCaseRepository();
    await new RecordOutboxEventUseCase(repo).Execute(
      {
        ...envelope,
        MessageId: 'recon-partial-source',
        Payload: { ExpectedStatus: 'Pending', ActualStatus: 'DeadLetter' },
      },
      ctx,
    );
    const run = await new CreateReconciliationRunUseCase(
      repo,
      new FakeReasonCatalog(),
      exceptions,
      audit as unknown as AuditedTransaction,
    ).Execute(
      {
        BusinessReference: envelope.BusinessReference,
        WarehouseId: 'WT-01-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-PARTIAL'],
        IdempotencyKey: 'recon-partial',
      },
      ctx,
    );
    repo.ReconciliationItems.push(
      new IntegrationReconciliationItemEntity({
        ...repo.ReconciliationItems[0],
        Id: 'recon-partial-open-item',
        MismatchType: 'StatusMismatchSecondary',
      }),
    );

    await new ResolveReconciliationItemUseCase(
      repo,
      new FakeReasonCatalog(),
      new FakeApprovalRequestRepository(),
      audit as unknown as AuditedTransaction,
    ).Execute(
      run.Items[0].Id,
      {
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-PARTIAL'],
        IdempotencyKey: 'resolve-recon-partial',
        ResolutionNote: 'External document fixed',
      },
      ctx,
    );

    expect(repo.ReconciliationRuns[0].RunStatus).toBe(IntegrationReconciliationRunStatus.CompletedWithMismatch);
  });
});
