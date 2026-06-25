import { createHash, randomUUID } from 'crypto';
import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import {
  CreateReconciliationRunDto,
  IntegrationReconciliationItemDto,
  IntegrationReconciliationRunDto,
  ListReconciliationItemsResultDto,
  ListReconciliationRunsResultDto,
  ResolveReconciliationItemDto,
} from '@modules/Integration/Application/DTOs/IntegrationDtos';
import {
  IIntegrationRepository,
  IntegrationListFilter,
  ReconciliationItemListFilter,
  ReconciliationRunListFilter,
} from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';
import { IntegrationReconciliationItemEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationItemEntity';
import { IntegrationReconciliationRunEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationRunEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IntegrationReconciliationItemStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationItemStatus';
import { IntegrationReconciliationRunStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationRunStatus';
import { IntegrationReconciliationSeverity } from '@modules/Integration/Domain/Enums/IntegrationReconciliationSeverity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

type ReconciliationRunQuery = Omit<
  ReconciliationRunListFilter,
  'CreatedFrom' | 'CreatedTo' | 'UpdatedFrom' | 'UpdatedTo'
> & {
  Page?: number;
  PageSize?: number;
  CreatedFrom?: string | Date;
  CreatedTo?: string | Date;
  UpdatedFrom?: string | Date;
  UpdatedTo?: string | Date;
};

type ReconciliationItemQuery = Omit<
  ReconciliationItemListFilter,
  'CreatedFrom' | 'CreatedTo' | 'UpdatedFrom' | 'UpdatedTo'
> &
  Pick<ReconciliationRunListFilter, 'BusinessReference' | 'WarehouseId' | 'OwnerId'> & {
    Page?: number;
    PageSize?: number;
    CreatedFrom?: string | Date;
    CreatedTo?: string | Date;
    UpdatedFrom?: string | Date;
    UpdatedTo?: string | Date;
  };

type MismatchDraft = {
  Item: IntegrationReconciliationItemEntity;
  Exception?: ExceptionCaseEntity;
};

type SourceCounts = Record<string, number>;

export class CreateReconciliationRunUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly exceptions: IExceptionCaseRepository,
    private readonly audited: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateReconciliationRunDto,
    context: AuditContext,
  ): Promise<{ Run: IntegrationReconciliationRunDto; Items: IntegrationReconciliationItemDto[] }> {
    const businessReference = this.Required(request.BusinessReference, 'BusinessReference');
    const warehouseId = this.Required(request.WarehouseId, 'WarehouseId');
    const ownerId = request.OwnerId?.trim() || null;
    const idempotencyKey = this.Required(request.IdempotencyKey, 'IdempotencyKey');
    const reasonCode = this.Required(request.ReasonCode, 'ReasonCode').toUpperCase();
    const evidenceRefs = this.NormalizeEvidence(request.EvidenceRefs);
    const reasonNote = request.ReasonNote?.trim() || reasonCode;
    const payloadHash = this.Hash({
      BusinessReference: businessReference,
      WarehouseId: warehouseId,
      OwnerId: ownerId,
      ReasonCode: reasonCode,
      ReasonNote: reasonNote,
      EvidenceRefs: evidenceRefs,
      IdempotencyKey: idempotencyKey,
    });

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.ReconciliationRun,
    });
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      await this.AuditCreateRejected(
        businessReference,
        warehouseId,
        ownerId,
        context,
        reasonCode,
        evidenceRefs,
        'EvidenceRefs are required for reconciliation run',
      );
      throw new BusinessRuleException('EvidenceRefs are required for reconciliation run');
    }

    const existing = await this.integrations.FindReconciliationRunByIdempotencyKey(
      idempotencyKey,
      businessReference,
      warehouseId,
      ownerId,
    );
    if (existing) {
      if (existing.RequestPayloadHash === payloadHash) {
        const items = await this.integrations.ListReconciliationItems(0, 100, { RunId: existing.Id });
        return {
          Run: IntegrationDtoMapper.ToReconciliationRunDto(existing, true),
          Items: items.Items.map((item) => IntegrationDtoMapper.ToReconciliationItemDto(item, true)),
        };
      }
      await this.AuditCreateRejected(
        businessReference,
        warehouseId,
        ownerId,
        context,
        reasonCode,
        evidenceRefs,
        'Idempotency key was reused with a different reconciliation payload',
        existing.Id,
      );
      throw new ConflictException('Idempotency key was reused with a different reconciliation payload');
    }

    const sourceFilter: IntegrationListFilter = {
      BusinessReference: businessReference,
      WarehouseContext: warehouseId,
    };
    if (ownerId) sourceFilter.OwnerContext = ownerId;
    else sourceFilter.OwnerContextIsNull = true;
    const interfaceMessages = await this.ListAllInterfaceMessages(sourceFilter);
    const sourceMessages = await this.ListAllOutboxMessages(sourceFilter);
    const now = new Date();
    const runId = randomUUID();
    const counts: SourceCounts = {
      InterfaceMessages: interfaceMessages.TotalItems,
      OutboxMessages: sourceMessages.TotalItems,
      DeadLetterMessages: 0,
      IntegrationFailureEvents: 0,
      ReconciliationFailureEvents: 0,
      QuantityMismatches: 0,
      StatusMismatches: 0,
      MissingSourceEvents: 0,
      MissingOutboxMessages: 0,
    };
    const drafts = await this.BuildMismatchItems(runId, interfaceMessages.Items, sourceMessages.Items, counts, now, {
      BusinessReference: businessReference,
      WarehouseId: warehouseId,
      OwnerId: ownerId,
      ReasonCodeId: reason.ReasonCodeId,
      EvidenceRefs: evidenceRefs,
      ActorUserId: context.ActorUserId,
    });
    const itemCount = drafts.length;
    const exceptionCount = drafts.filter((draft) => draft.Item.ExceptionCaseId).length;
    const run = new IntegrationReconciliationRunEntity({
      Id: runId,
      BusinessReference: businessReference,
      WarehouseId: warehouseId,
      OwnerId: ownerId,
      RunStatus:
        itemCount > 0
          ? IntegrationReconciliationRunStatus.CompletedWithMismatch
          : IntegrationReconciliationRunStatus.Completed,
      SourceCounts: counts,
      ItemCount: itemCount,
      MismatchCount: itemCount,
      ExceptionCount: exceptionCount,
      IdempotencyKey: idempotencyKey,
      RequestPayloadHash: payloadHash,
      ReasonCode: reasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: reasonNote,
      EvidenceRefs: evidenceRefs,
      CreatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedAt: now,
    });

    try {
      return await this.audited.Run(async (manager) => {
        for (const draft of drafts) {
          if (draft.Exception) {
            await this.exceptions.Create(draft.Exception, manager);
          }
        }
        const saved = await this.integrations.CreateReconciliationRun(
          run,
          drafts.map((draft) => draft.Item),
          manager,
        );
        const result = {
          Run: IntegrationDtoMapper.ToReconciliationRunDto(saved.Run),
          Items: saved.Items.map((item) => IntegrationDtoMapper.ToReconciliationItemDto(item)),
        };
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.ReconciliationRun,
            ObjectId: saved.Run.Id,
            ObjectCode: saved.Run.BusinessReference,
            BeforeJson: null,
            AfterJson: result.Run as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: reasonNote,
            EvidenceRefs: evidenceRefs,
            WarehouseId: warehouseId,
            OwnerId: ownerId,
            ReferenceType: 'IntegrationReconciliationRun',
            ReferenceId: saved.Run.Id,
            Result: AuditResult.Success,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const raced = await this.integrations.FindReconciliationRunByIdempotencyKey(
          idempotencyKey,
          businessReference,
          warehouseId,
          ownerId,
        );
        if (raced?.RequestPayloadHash === payloadHash) {
          const items = await this.integrations.ListReconciliationItems(0, 100, { RunId: raced.Id });
          return {
            Run: IntegrationDtoMapper.ToReconciliationRunDto(raced, true),
            Items: items.Items.map((item) => IntegrationDtoMapper.ToReconciliationItemDto(item, true)),
          };
        }
      }
      throw error;
    }
  }

  private async ListAllOutboxMessages(
    filter: IntegrationListFilter,
  ): Promise<{ Items: OutboxMessageEntity[]; TotalItems: number }> {
    const pageSize = 100;
    const items: OutboxMessageEntity[] = [];
    let totalItems = 0;
    let skip = 0;

    do {
      const page = await this.integrations.ListOutboxMessages(skip, pageSize, filter);
      totalItems = page.TotalItems;
      items.push(...page.Items);
      if (page.Items.length === 0) break;
      skip += page.Items.length;
    } while (items.length < totalItems);

    return { Items: items, TotalItems: totalItems };
  }

  private async ListAllInterfaceMessages(
    filter: IntegrationListFilter,
  ): Promise<{ Items: InterfaceMessageEntity[]; TotalItems: number }> {
    const pageSize = 100;
    const items: InterfaceMessageEntity[] = [];
    let totalItems = 0;
    let skip = 0;

    do {
      const page = await this.integrations.ListInterfaceMessages(skip, pageSize, filter);
      totalItems = page.TotalItems;
      items.push(...page.Items);
      if (page.Items.length === 0) break;
      skip += page.Items.length;
    } while (items.length < totalItems);

    return { Items: items, TotalItems: totalItems };
  }

  private async BuildMismatchItems(
    runId: string,
    interfaceMessages: InterfaceMessageEntity[],
    outboxMessages: OutboxMessageEntity[],
    counts: SourceCounts,
    now: Date,
    context: {
      BusinessReference: string;
      WarehouseId: string;
      OwnerId: string | null;
      ReasonCodeId: string | null;
      EvidenceRefs: string[];
      ActorUserId: string | null;
    },
  ): Promise<MismatchDraft[]> {
    if (interfaceMessages.length === 0 && outboxMessages.length === 0) {
      counts.MissingSourceEvents += 1;
      return [
        await this.CreateDraft({
          RunId: runId,
          MismatchType: 'MissingSourceEvents',
          SourceType: 'IntegrationOutbox',
          SourceId: null,
          Severity: IntegrationReconciliationSeverity.High,
          ExpectedSummary: { BusinessReference: context.BusinessReference, WarehouseId: context.WarehouseId },
          ActualSummary: { OutboxMessages: 0 },
          Now: now,
          Context: context,
        }),
      ];
    }

    const drafts: MismatchDraft[] = [];
    const outboxSourceIds = new Set(outboxMessages.map((message) => message.SourceMessageId).filter(Boolean));
    for (const message of interfaceMessages) {
      if (!outboxSourceIds.has(message.MessageId)) {
        counts.MissingOutboxMessages += 1;
        drafts.push(
          await this.CreateDraft({
            RunId: runId,
            MismatchType: 'MissingOutboxMessage',
            SourceType: 'InterfaceMessage',
            SourceId: message.MessageId,
            Severity: IntegrationReconciliationSeverity.High,
            ExpectedSummary: { OutboxSourceMessageId: message.MessageId },
            ActualSummary: { InterfaceStatus: message.MessageStatus, Payload: message.Payload },
            Now: now,
            ExistingExceptionCaseId: this.PayloadString(message.Payload, 'ExceptionCaseId'),
            Context: context,
          }),
        );
      }
    }

    for (const message of outboxMessages) {
      if (message.Status === OutboxMessageStatus.DeadLetter) {
        counts.DeadLetterMessages += 1;
        drafts.push(
          await this.CreateDraft({
            RunId: runId,
            MismatchType: 'DeadLetterMessage',
            SourceType: message.EventType,
            SourceId: message.MessageId,
            Severity: IntegrationReconciliationSeverity.High,
            ExpectedSummary: { Status: OutboxMessageStatus.Pending },
            ActualSummary: {
              Status: message.Status,
              FailureCategory: message.FailureCategory,
              DeadLetterReason: message.DeadLetterReason,
            },
            Now: now,
            OutboxMessageId: message.Id,
            DeadLetterMessageId: message.Id,
            ExistingExceptionCaseId: this.PayloadString(message.Payload, 'ExceptionCaseId'),
            Context: context,
          }),
        );
      }

      if (message.EventType === 'InventoryReconciliationFailed') {
        counts.ReconciliationFailureEvents += 1;
        drafts.push(
          await this.CreateDraft({
            RunId: runId,
            MismatchType: 'InventoryReconciliationFailed',
            SourceType: message.EventType,
            SourceId: message.MessageId,
            Severity: IntegrationReconciliationSeverity.High,
            ExpectedSummary: { ReconciliationState: 'Balanced' },
            ActualSummary: message.Payload,
            Now: now,
            OutboxMessageId: message.Id,
            ExistingExceptionCaseId: this.PayloadString(message.Payload, 'ExceptionCaseId'),
            Context: context,
          }),
        );
      } else if (message.EventType === 'IntegrationSyncFailed' || message.FailureCategory) {
        counts.IntegrationFailureEvents += 1;
        drafts.push(
          await this.CreateDraft({
            RunId: runId,
            MismatchType: 'IntegrationFailure',
            SourceType: message.EventType,
            SourceId: message.MessageId,
            Severity: IntegrationReconciliationSeverity.Medium,
            ExpectedSummary: { IntegrationState: OutboxMessageStatus.Pending },
            ActualSummary: {
              Status: message.Status,
              FailureCategory: message.FailureCategory,
              Payload: message.Payload,
            },
            Now: now,
            OutboxMessageId: message.Id,
            ExistingExceptionCaseId: this.PayloadString(message.Payload, 'ExceptionCaseId'),
            Context: context,
          }),
        );
      }

      const quantityMismatch = this.ExtractQuantityMismatch(message.Payload);
      if (quantityMismatch) {
        counts.QuantityMismatches += 1;
        drafts.push(
          await this.CreateDraft({
            RunId: runId,
            MismatchType: 'QuantityMismatch',
            SourceType: message.EventType,
            SourceId: message.MessageId,
            Severity: IntegrationReconciliationSeverity.High,
            ExpectedSummary: { Quantity: quantityMismatch.Expected },
            ActualSummary: { Quantity: quantityMismatch.Actual, Payload: message.Payload },
            Now: now,
            OutboxMessageId: message.Id,
            ExistingExceptionCaseId: this.PayloadString(message.Payload, 'ExceptionCaseId'),
            Context: context,
          }),
        );
      }

      const statusMismatch = this.ExtractStatusMismatch(message.Payload);
      if (statusMismatch) {
        counts.StatusMismatches += 1;
        drafts.push(
          await this.CreateDraft({
            RunId: runId,
            MismatchType: 'StatusMismatch',
            SourceType: message.EventType,
            SourceId: message.MessageId,
            Severity: IntegrationReconciliationSeverity.Medium,
            ExpectedSummary: { Status: statusMismatch.Expected },
            ActualSummary: { Status: statusMismatch.Actual, Payload: message.Payload },
            Now: now,
            OutboxMessageId: message.Id,
            ExistingExceptionCaseId: this.PayloadString(message.Payload, 'ExceptionCaseId'),
            Context: context,
          }),
        );
      }
    }
    return drafts;
  }

  private async CreateDraft(input: {
    RunId: string;
    MismatchType: string;
    SourceType: string;
    SourceId: string | null;
    Severity: IntegrationReconciliationSeverity;
    ExpectedSummary: Record<string, unknown> | null;
    ActualSummary: Record<string, unknown> | null;
    Now: Date;
    OutboxMessageId?: string | null;
    DeadLetterMessageId?: string | null;
    ExistingExceptionCaseId?: string | null;
    Context: {
      BusinessReference: string;
      WarehouseId: string;
      OwnerId: string | null;
      ReasonCodeId: string | null;
      EvidenceRefs: string[];
      ActorUserId: string | null;
    };
  }): Promise<MismatchDraft> {
    const itemId = randomUUID();
    const existingExceptionCaseId = await this.ResolveExistingExceptionCaseId(input.ExistingExceptionCaseId, {
      WarehouseId: input.Context.WarehouseId,
      OwnerId: input.Context.OwnerId,
    });
    const exceptionId = existingExceptionCaseId ?? randomUUID();
    const item = new IntegrationReconciliationItemEntity({
      Id: itemId,
      RunId: input.RunId,
      ItemStatus: IntegrationReconciliationItemStatus.Open,
      Severity: input.Severity,
      MismatchType: input.MismatchType,
      SourceType: input.SourceType,
      SourceId: input.SourceId,
      ExpectedSummary: input.ExpectedSummary,
      ActualSummary: input.ActualSummary,
      ExceptionCaseId: exceptionId,
      OutboxMessageId: input.OutboxMessageId ?? null,
      DeadLetterMessageId: input.DeadLetterMessageId ?? null,
      CreatedAt: input.Now,
      UpdatedAt: input.Now,
    });
    if (existingExceptionCaseId) return { Item: item };

    return {
      Item: item,
      Exception: new ExceptionCaseEntity({
        Id: exceptionId,
        ExceptionType: 'CTRL-V1-INVENTORY-RECONCILIATION',
        ReferenceType: 'IntegrationReconciliationItem',
        ReferenceId: itemId,
        WarehouseId: input.Context.WarehouseId,
        OwnerId: input.Context.OwnerId,
        ReasonCodeId: input.Context.ReasonCodeId,
        Severity: this.ToControlSeverity(input.Severity),
        EvidenceRefs: input.Context.EvidenceRefs,
        ResolutionNote: `${input.MismatchType} detected for ${input.Context.BusinessReference}`,
        OpenedAt: input.Now,
        CreatedAt: input.Now,
        UpdatedAt: input.Now,
        CreatedBy: input.Context.ActorUserId,
        UpdatedBy: input.Context.ActorUserId,
      }),
    };
  }

  private async ResolveExistingExceptionCaseId(
    id: string | null | undefined,
    scope: { WarehouseId: string; OwnerId: string | null },
  ): Promise<string | null> {
    if (!id) return null;
    const existing = await this.exceptions.FindById(id);
    if (!existing) return null;
    if (existing.WarehouseId !== scope.WarehouseId) return null;
    if ((existing.OwnerId ?? null) !== scope.OwnerId) return null;
    return existing.Id;
  }

  private async AuditCreateRejected(
    businessReference: string,
    warehouseId: string,
    ownerId: string | null,
    context: AuditContext,
    reasonCode: string,
    evidenceRefs: string[],
    blockedReason: string,
    objectId?: string,
  ): Promise<void> {
    await this.audited.Run(async () => ({
      result: null,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.ReconciliationRun,
        ObjectId: objectId ?? null,
        ObjectCode: businessReference,
        BeforeJson: null,
        AfterJson: { BlockedReason: blockedReason },
        ReasonCodeId: null,
        ReasonNote: reasonCode,
        EvidenceRefs: evidenceRefs,
        WarehouseId: warehouseId,
        OwnerId: ownerId,
        ReferenceType: 'IntegrationReconciliationRun',
        ReferenceId: objectId ?? businessReference,
        Result: AuditResult.Failed,
      }),
    }));
  }

  private ExtractQuantityMismatch(payload: Record<string, unknown>): { Expected: unknown; Actual: unknown } | null {
    const expected = this.PayloadValue(payload, 'ExpectedQuantity') ?? this.PayloadValue(payload, 'DocumentQuantity');
    const actual = this.PayloadValue(payload, 'ActualQuantity') ?? this.PayloadValue(payload, 'TransactionQuantity');
    if (expected === undefined || actual === undefined || expected === actual) return null;
    return { Expected: expected, Actual: actual };
  }

  private ExtractStatusMismatch(payload: Record<string, unknown>): { Expected: unknown; Actual: unknown } | null {
    const expected = this.PayloadValue(payload, 'ExpectedStatus');
    const actual = this.PayloadValue(payload, 'ActualStatus');
    if (expected === undefined || actual === undefined || expected === actual) return null;
    return { Expected: expected, Actual: actual };
  }

  private PayloadValue(payload: Record<string, unknown>, key: string): unknown {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    return payload[key] ?? payload[camelKey];
  }

  private PayloadString(payload: Record<string, unknown>, key: string): string | null {
    const value = this.PayloadValue(payload, key);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private ToControlSeverity(severity: IntegrationReconciliationSeverity): ControlExceptionSeverity {
    switch (severity) {
      case IntegrationReconciliationSeverity.High:
        return ControlExceptionSeverity.High;
      case IntegrationReconciliationSeverity.Medium:
        return ControlExceptionSeverity.Medium;
      default:
        return ControlExceptionSeverity.Low;
    }
  }

  private Required(value: string | null | undefined, field: string): string {
    const normalized = value?.trim();
    if (!normalized) throw new BusinessRuleException(`${field} is required`);
    return normalized;
  }

  private NormalizeEvidence(evidenceRefs: string[] | undefined): string[] {
    return [...new Set((evidenceRefs ?? []).map((item) => item.trim()).filter(Boolean))];
  }

  private Hash(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.SortJson(value)))
      .digest('hex');
  }

  private SortJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.SortJson(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.SortJson(item)]),
      );
    }
    return value;
  }
}

export class ListReconciliationRunsUseCase {
  constructor(private readonly integrations: IIntegrationRepository) {}

  public async Execute(query: ReconciliationRunQuery): Promise<ListReconciliationRunsResultDto> {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const filter: ReconciliationRunListFilter = {};
    if (query.BusinessReference) filter.BusinessReference = query.BusinessReference;
    if (query.WarehouseId) filter.WarehouseId = query.WarehouseId;
    if (query.OwnerId) filter.OwnerId = query.OwnerId;
    if (query.RunStatus) filter.RunStatus = query.RunStatus;
    if (query.CreatedFrom) filter.CreatedFrom = this.ToDate(query.CreatedFrom);
    if (query.CreatedTo) filter.CreatedTo = this.ToDate(query.CreatedTo);
    if (query.UpdatedFrom) filter.UpdatedFrom = this.ToDate(query.UpdatedFrom);
    if (query.UpdatedTo) filter.UpdatedTo = this.ToDate(query.UpdatedTo);
    const result = await this.integrations.ListReconciliationRuns(paging.Skip, paging.Take, filter);
    return ToPagedResult(
      result.Items.map((item) => IntegrationDtoMapper.ToReconciliationRunDto(item)),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }

  private ToDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }
}

export class GetReconciliationRunUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(id: string, context?: AuditContext): Promise<IntegrationReconciliationRunDto> {
    const run = await this.integrations.FindReconciliationRunById(id);
    if (!run) throw new NotFoundException('Integration reconciliation run not found', { Id: id });
    await this.AssertPermission(context, ActionCode.Read, run);
    return IntegrationDtoMapper.ToReconciliationRunDto(run);
  }

  private async AssertPermission(
    context: AuditContext | undefined,
    action: ActionCode,
    run: IntegrationReconciliationRunEntity,
  ): Promise<void> {
    if (!this.permissionChecker || !context?.ActorUserId) return;
    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
      Action: action,
      ObjectType: ObjectType.ReconciliationRun,
      Scope: { WarehouseId: run.WarehouseId, OwnerId: run.OwnerId },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, { Reason: decision.Reason });
    }
  }
}

export class ListReconciliationItemsUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    runId: string,
    query: ReconciliationItemQuery,
    context?: AuditContext,
  ): Promise<ListReconciliationItemsResultDto> {
    const run = await this.integrations.FindReconciliationRunById(runId);
    if (!run) throw new NotFoundException('Integration reconciliation run not found', { Id: runId });
    await this.AssertPermission(context, ActionCode.Read, run);
    if (!this.MatchesRunScope(run, query)) {
      const paging = GetPagination(
        { Page: query.Page, PageSize: query.PageSize },
        { DefaultPageSize: 50, MaxPageSize: 100 },
      );
      return ToPagedResult([], 0, paging.Page, paging.PageSize);
    }
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const filter: ReconciliationItemListFilter = { RunId: runId };
    if (query.ItemStatus) filter.ItemStatus = query.ItemStatus;
    if (query.Severity) filter.Severity = query.Severity;
    if (query.MismatchType) filter.MismatchType = query.MismatchType;
    if (query.CreatedFrom) filter.CreatedFrom = this.ToDate(query.CreatedFrom);
    if (query.CreatedTo) filter.CreatedTo = this.ToDate(query.CreatedTo);
    if (query.UpdatedFrom) filter.UpdatedFrom = this.ToDate(query.UpdatedFrom);
    if (query.UpdatedTo) filter.UpdatedTo = this.ToDate(query.UpdatedTo);
    const result = await this.integrations.ListReconciliationItems(paging.Skip, paging.Take, filter);
    return ToPagedResult(
      result.Items.map((item) => IntegrationDtoMapper.ToReconciliationItemDto(item)),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }

  private MatchesRunScope(run: IntegrationReconciliationRunEntity, query: ReconciliationItemQuery): boolean {
    if (query.BusinessReference && run.BusinessReference !== query.BusinessReference) return false;
    if (query.WarehouseId && run.WarehouseId !== query.WarehouseId) return false;
    if (query.OwnerId && run.OwnerId !== query.OwnerId) return false;
    return true;
  }

  private ToDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private async AssertPermission(
    context: AuditContext | undefined,
    action: ActionCode,
    run: IntegrationReconciliationRunEntity,
  ): Promise<void> {
    if (!this.permissionChecker || !context?.ActorUserId) return;
    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
      Action: action,
      ObjectType: ObjectType.ReconciliationRun,
      Scope: { WarehouseId: run.WarehouseId, OwnerId: run.OwnerId },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, { Reason: decision.Reason });
    }
  }
}

export class ResolveReconciliationItemUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly approvalRequests: IApprovalRequestRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    id: string,
    request: ResolveReconciliationItemDto,
    context: AuditContext,
  ): Promise<IntegrationReconciliationItemDto> {
    const current = await this.integrations.FindReconciliationItemById(id);
    if (!current) throw new NotFoundException('Integration reconciliation item not found', { Id: id });
    const run = await this.integrations.FindReconciliationRunById(current.RunId);
    if (!run) throw new NotFoundException('Integration reconciliation run not found', { Id: current.RunId });
    await this.AssertPermission(context, ActionCode.Update, run);

    const reasonCode = this.Required(request.ReasonCode, 'ReasonCode').toUpperCase();
    const reasonNote = request.ReasonNote?.trim() || reasonCode;
    const evidenceRefs = this.NormalizeEvidence(request.EvidenceRefs);
    const resolutionNote = this.Required(request.ResolutionNote, 'ResolutionNote');
    const idempotencyKey = this.Required(request.IdempotencyKey, 'IdempotencyKey');
    const payloadHash = this.Hash({
      ReasonCode: reasonCode,
      ReasonNote: reasonNote,
      EvidenceRefs: evidenceRefs,
      ResolutionNote: resolutionNote,
      ApprovalRequestId: request.ApprovalRequestId ?? null,
      ImpactsInventory: Boolean(request.ImpactsInventory),
      ImpactsFinance: Boolean(request.ImpactsFinance),
      IdempotencyKey: idempotencyKey,
    });

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.ReconciliationRun,
    });
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      await this.AuditRejected(
        current,
        context,
        reasonCode,
        evidenceRefs,
        'EvidenceRefs are required for reconciliation resolution',
      );
      throw new BusinessRuleException('EvidenceRefs are required for reconciliation resolution');
    }
    const approvalRequestId = request.ApprovalRequestId?.trim() || null;
    if ((reason.ApprovalRequired || request.ImpactsInventory || request.ImpactsFinance) && !approvalRequestId) {
      await this.AuditRejected(
        current,
        context,
        reasonCode,
        evidenceRefs,
        'ApprovalRequestId is required for approval-required or inventory/finance impacting resolution',
      );
      throw new BusinessRuleException(
        'ApprovalRequestId is required for approval-required or inventory/finance impacting resolution',
      );
    }
    if (approvalRequestId) {
      await this.AssertApprovedResolution(run, approvalRequestId);
    }
    if (current.ResolutionIdempotencyKey === idempotencyKey) {
      if (current.ResolutionPayloadHash === payloadHash) {
        return IntegrationDtoMapper.ToReconciliationItemDto(current, true);
      }
      await this.AuditRejected(
        current,
        context,
        reasonCode,
        evidenceRefs,
        'Idempotency key was reused with a different reconciliation resolution payload',
      );
      throw new ConflictException('Idempotency key was reused with a different reconciliation resolution payload');
    }
    if (current.ItemStatus === IntegrationReconciliationItemStatus.Resolved) {
      await this.AuditRejected(current, context, reasonCode, evidenceRefs, 'Reconciliation item is already resolved');
      throw new BusinessRuleException('Reconciliation item is already resolved');
    }

    return await this.audited.Run(async (manager) => {
      const locked = await this.integrations.FindReconciliationItemById(id, manager, { Lock: true });
      if (!locked) throw new NotFoundException('Integration reconciliation item not found', { Id: id });
      if (locked.ResolutionIdempotencyKey === idempotencyKey) {
        if (locked.ResolutionPayloadHash !== payloadHash) {
          throw new ConflictException('Idempotency key was reused with a different reconciliation resolution payload');
        }
        const duplicate = IntegrationDtoMapper.ToReconciliationItemDto(locked, true);
        return {
          result: duplicate,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.ReconciliationRun,
            ObjectId: locked.Id,
            ObjectCode: locked.MismatchType,
            BeforeJson: duplicate as unknown as Record<string, unknown>,
            AfterJson: duplicate as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: reasonNote,
            EvidenceRefs: evidenceRefs,
            ReferenceType: 'IntegrationReconciliationItem',
            ReferenceId: locked.Id,
            Result: AuditResult.Success,
          }),
        };
      }
      if (locked.ItemStatus === IntegrationReconciliationItemStatus.Resolved) {
        throw new ConflictException('Reconciliation item state changed to resolved');
      }

      const now = new Date();
      const updated = new IntegrationReconciliationItemEntity({
        ...locked,
        ItemStatus: IntegrationReconciliationItemStatus.Resolved,
        ResolutionNote: resolutionNote,
        ResolutionIdempotencyKey: idempotencyKey,
        ResolutionPayloadHash: payloadHash,
        ApprovalRequestId: approvalRequestId,
        ReasonCode: reasonCode,
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: reasonNote,
        EvidenceRefs: evidenceRefs,
        ResolvedAt: now,
        ResolvedBy: context.ActorUserId,
        UpdatedAt: now,
      });
      const saved = await this.integrations.UpdateReconciliationItem(updated, manager);
      const openItems = await this.integrations.ListReconciliationItems(
        0,
        1,
        { RunId: saved.RunId, ItemStatus: IntegrationReconciliationItemStatus.Open },
        manager,
      );
      const allResolved = openItems.TotalItems === 0;
      const run = await this.integrations.FindReconciliationRunById(saved.RunId, manager);
      if (run && allResolved) {
        run.RunStatus = IntegrationReconciliationRunStatus.Resolved;
        run.ResolvedAt = now;
        run.ResolvedBy = context.ActorUserId;
        run.UpdatedAt = now;
        await this.integrations.UpdateReconciliationRun(run, manager);
      }
      const result = IntegrationDtoMapper.ToReconciliationItemDto(saved);
      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.ReconciliationRun,
          ObjectId: saved.Id,
          ObjectCode: saved.MismatchType,
          BeforeJson: IntegrationDtoMapper.ToReconciliationItemDto(locked) as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: reasonNote,
          EvidenceRefs: evidenceRefs,
          ReferenceType: 'IntegrationReconciliationItem',
          ReferenceId: saved.Id,
          Result: AuditResult.Success,
        }),
      };
    });
  }

  private async AssertPermission(
    context: AuditContext,
    action: ActionCode,
    run: IntegrationReconciliationRunEntity,
  ): Promise<void> {
    if (!this.permissionChecker || !context.ActorUserId) return;
    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
      Action: action,
      ObjectType: ObjectType.ReconciliationRun,
      Scope: { WarehouseId: run.WarehouseId, OwnerId: run.OwnerId },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, { Reason: decision.Reason });
    }
  }

  private async AssertApprovedResolution(
    run: IntegrationReconciliationRunEntity,
    approvalRequestId: string,
  ): Promise<void> {
    const approval = await this.approvalRequests.FindById(approvalRequestId);
    if (!approval || approval.Decision !== ApprovalDecision.Approved) {
      throw new BusinessRuleException('Reconciliation resolution approval is not approved', {
        RunId: run.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
    if (approval.Action !== ActionCode.Update || approval.TargetObjectType !== ObjectType.ReconciliationRun) {
      throw new BusinessRuleException('ApprovalRequest does not approve ReconciliationRun Update', {
        RunId: run.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
    if (approval.TargetObjectId !== run.Id) {
      throw new BusinessRuleException('ApprovalRequest target does not match reconciliation run', {
        RunId: run.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
    const scope = approval.Scope ?? {};
    if (scope.WarehouseId != null && scope.WarehouseId !== run.WarehouseId) {
      throw new BusinessRuleException('ApprovalRequest warehouse scope does not match reconciliation run', {
        RunId: run.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
    if (scope.OwnerId != null && scope.OwnerId !== run.OwnerId) {
      throw new BusinessRuleException('ApprovalRequest owner scope does not match reconciliation run', {
        RunId: run.Id,
        ApprovalRequestId: approvalRequestId,
      });
    }
  }

  private async AuditRejected(
    current: IntegrationReconciliationItemEntity,
    context: AuditContext,
    reasonCode: string,
    evidenceRefs: string[],
    blockedReason: string,
  ): Promise<void> {
    await this.audited.Run(async () => ({
      result: null,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.ReconciliationRun,
        ObjectId: current.Id,
        ObjectCode: current.MismatchType,
        BeforeJson: IntegrationDtoMapper.ToReconciliationItemDto(current) as unknown as Record<string, unknown>,
        AfterJson: { BlockedReason: blockedReason },
        ReasonCodeId: null,
        ReasonNote: reasonCode,
        EvidenceRefs: evidenceRefs,
        ReferenceType: 'IntegrationReconciliationItem',
        ReferenceId: current.Id,
        Result: AuditResult.Failed,
      }),
    }));
  }

  private Required(value: string | null | undefined, field: string): string {
    const normalized = value?.trim();
    if (!normalized) throw new BusinessRuleException(`${field} is required`);
    return normalized;
  }

  private NormalizeEvidence(evidenceRefs: string[] | undefined): string[] {
    return [...new Set((evidenceRefs ?? []).map((item) => item.trim()).filter(Boolean))];
  }

  private Hash(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.SortJson(value)))
      .digest('hex');
  }

  private SortJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.SortJson(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.SortJson(item)]),
      );
    }
    return value;
  }
}
