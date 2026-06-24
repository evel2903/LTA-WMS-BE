import { randomUUID } from 'crypto';
import { NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { OutboxMessageDto, RecordOutboxFailureDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

const DEFAULT_MAX_ATTEMPTS = 5;

export class RecordOutboxFailureUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly audited: AuditedTransaction,
  ) {}

  public async Execute(id: string, request: RecordOutboxFailureDto, context: AuditContext): Promise<OutboxMessageDto> {
    return await this.audited.Run(async (manager) => {
      const current = await this.integrations.FindOutboxMessageById(id, manager, { Lock: true });
      if (!current) throw new NotFoundException('Integration outbox message not found', { Id: id });
      if (this.IsResolutionTerminal(current.Status)) {
        const result = IntegrationDtoMapper.ToOutboxMessageDto(current, true);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.IntegrationMessage,
            ObjectId: current.Id,
            ObjectCode: current.MessageId,
            BeforeJson: result as unknown as Record<string, unknown>,
            AfterJson: result as unknown as Record<string, unknown>,
            WarehouseId: current.WarehouseContext,
            OwnerId: current.OwnerContext,
            ReferenceType: 'OutboxFailureDuplicate',
            ReferenceId: current.Id,
            Result: AuditResult.Success,
          }),
        };
      }

      const now = new Date();
      const maxAttempts = Math.min(current.MaxAttempts || DEFAULT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
      const nextAttempt = current.AttemptCount + 1;
      const shouldDeadLetter =
        request.FailureCategory !== IntegrationFailureCategory.Transient || nextAttempt >= maxAttempts;
      const failureCategory =
        request.FailureCategory === IntegrationFailureCategory.Transient && shouldDeadLetter
          ? IntegrationFailureCategory.RetryExhausted
          : request.FailureCategory;

      const updated = new OutboxMessageEntity({
        ...current,
        AttemptCount: nextAttempt,
        MaxAttempts: maxAttempts,
        Status: shouldDeadLetter ? OutboxMessageStatus.DeadLetter : OutboxMessageStatus.Retrying,
        NextRetryAt: shouldDeadLetter ? null : this.CalculateNextRetryAt(now, nextAttempt),
        LastError: request.ErrorMessage,
        FailureCategory: failureCategory,
        DeadLetterReason: shouldDeadLetter ? request.ErrorMessage : current.DeadLetterReason,
        DeadLetteredAt: shouldDeadLetter ? now : current.DeadLetteredAt,
        UpdatedAt: now,
      });

      const syncFailed = shouldDeadLetter
        ? this.BuildSyncFailedTrace(updated, failureCategory, request.ErrorMessage, now)
        : null;
      const saved = await this.integrations.UpdateOutboxMessage(updated, manager);
      if (syncFailed) {
        const existingTrace = await this.integrations.FindOutboxMessageByMessageId(syncFailed.MessageId, manager);
        if (!existingTrace) await this.integrations.CreateOutboxMessage(syncFailed, manager);
      }
      const result = IntegrationDtoMapper.ToOutboxMessageDto(saved);
      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.IntegrationMessage,
          ObjectId: saved.Id,
          ObjectCode: saved.MessageId,
          BeforeJson: IntegrationDtoMapper.ToOutboxMessageDto(current) as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          ReasonCodeId: null,
          ReasonNote: request.ErrorMessage,
          WarehouseId: saved.WarehouseContext,
          OwnerId: saved.OwnerContext,
          ReferenceType: syncFailed ? 'IntegrationSyncFailed' : 'OutboxRetry',
          ReferenceId: syncFailed?.Id ?? saved.Id,
          Result: AuditResult.Success,
        }),
      };
    });
  }

  private CalculateNextRetryAt(now: Date, attempt: number): Date {
    const backoffSeconds = Math.min(3600, Math.pow(2, Math.max(0, attempt - 1)) * 60);
    return new Date(now.getTime() + backoffSeconds * 1000);
  }

  private BuildSyncFailedTrace(
    source: OutboxMessageEntity,
    category: IntegrationFailureCategory,
    errorMessage: string,
    now: Date,
  ): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: randomUUID(),
      SourceMessageId: source.Id,
      MessageId: `${source.MessageId}:IntegrationSyncFailed`,
      EventType: 'IntegrationSyncFailed',
      Version: source.Version,
      BusinessReference: source.BusinessReference,
      SourceSystem: 'LTA-WMS',
      TargetSystem: 'Integration',
      WarehouseContext: source.WarehouseContext,
      OwnerContext: source.OwnerContext,
      EventTime: now,
      CorrelationId: source.CorrelationId,
      CausationId: source.MessageId,
      Payload: {
        SourceOutboxId: source.Id,
        SourceMessageId: source.MessageId,
        EventType: source.EventType,
        FailureCategory: category,
        ErrorMessage: errorMessage,
        AttemptCount: source.AttemptCount,
        MaxAttempts: source.MaxAttempts,
      },
      Status: OutboxMessageStatus.Pending,
      CreatedAt: now,
      CreatedBy: source.CreatedBy,
      UpdatedAt: now,
    });
  }

  private IsResolutionTerminal(status: OutboxMessageStatus): boolean {
    return [
      OutboxMessageStatus.Dispatched,
      OutboxMessageStatus.DeadLetter,
      OutboxMessageStatus.ManualFixed,
      OutboxMessageStatus.Acknowledged,
      OutboxMessageStatus.Ignored,
    ].includes(status);
  }
}
