import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IntegrationEnvelopeDto, OutboxMessageDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';
import { IntegrationEnvelopeValidation } from '@modules/Integration/Application/UseCases/IntegrationEnvelopeValidation';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

export class RecordOutboxEventUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: IntegrationEnvelopeDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<OutboxMessageDto> {
    IntegrationEnvelopeValidation.Validate(request);

    const existing = await this.integrations.FindOutboxMessageByMessageId(request.MessageId);
    if (existing) return this.ToDuplicateDto(existing, request);

    const outbox = new OutboxMessageEntity({
      Id: randomUUID(),
      SourceMessageId: null,
      MessageId: request.MessageId,
      EventType: request.MessageType,
      Version: request.Version,
      BusinessReference: request.BusinessReference,
      SourceSystem: request.SourceSystem,
      TargetSystem: request.TargetSystem,
      WarehouseContext: request.WarehouseContext,
      OwnerContext: request.OwnerContext ?? null,
      EventTime: request.EventTime,
      CorrelationId: request.CorrelationId ?? null,
      CausationId: request.CausationId ?? null,
      Payload: request.Payload,
      Status: OutboxMessageStatus.Pending,
      CreatedAt: new Date(),
      CreatedBy: context.ActorUserId,
    });

    const write = async (manager?: Parameters<IIntegrationRepository['CreateOutboxMessage']>[1]) =>
      this.integrations.CreateOutboxMessage(outbox, manager);

    if (!this.auditedTransaction) {
      try {
        return IntegrationDtoMapper.ToOutboxMessageDto(await write());
      } catch (error) {
        const duplicate = await this.TryResolveDuplicateWriteConflict(error, request);
        if (duplicate) return duplicate;
        throw error;
      }
    }

    try {
      return await this.auditedTransaction.Run(async (manager) => {
        const created = await write(manager);
        const result = IntegrationDtoMapper.ToOutboxMessageDto(created);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.IntegrationMessage,
            ObjectId: created.Id,
            ObjectCode: created.MessageId,
            BeforeJson: null,
            AfterJson: result as unknown as Record<string, unknown>,
            ReasonCodeId: null,
            ReasonNote: null,
            WarehouseId: created.WarehouseContext,
            OwnerId: created.OwnerContext,
            ReferenceType: 'OutboxMessage',
            ReferenceId: created.Id,
          }),
        };
      });
    } catch (error) {
      const duplicate = await this.TryResolveDuplicateWriteConflict(error, request);
      if (duplicate) return duplicate;
      throw error;
    }
  }

  private async TryResolveDuplicateWriteConflict(
    error: unknown,
    request: IntegrationEnvelopeDto,
  ): Promise<OutboxMessageDto | null> {
    if (!(error instanceof ConflictException)) return null;
    const existing = await this.integrations.FindOutboxMessageByMessageId(request.MessageId);
    if (!existing) return null;
    return this.ToDuplicateDto(existing, request);
  }

  private ToDuplicateDto(existing: OutboxMessageEntity, request: IntegrationEnvelopeDto): OutboxMessageDto {
    this.AssertDuplicateOutboxMatches(existing, request);
    return IntegrationDtoMapper.ToOutboxMessageDto(existing, true);
  }

  private AssertDuplicateOutboxMatches(existing: OutboxMessageEntity, request: IntegrationEnvelopeDto): void {
    const mismatches: string[] = [];
    const compare = (field: string, actual: unknown, expected: unknown) => {
      if (actual !== expected) mismatches.push(field);
    };

    compare('MessageId', request.MessageId, existing.MessageId);
    compare('MessageType', request.MessageType, existing.EventType);
    compare('Version', request.Version, existing.Version);
    compare('BusinessReference', request.BusinessReference, existing.BusinessReference);
    compare('SourceSystem', request.SourceSystem, existing.SourceSystem);
    compare('TargetSystem', request.TargetSystem, existing.TargetSystem);
    compare('WarehouseContext', request.WarehouseContext, existing.WarehouseContext);
    compare('OwnerContext', request.OwnerContext ?? null, existing.OwnerContext);
    compare('EventTime', request.EventTime.toISOString(), existing.EventTime.toISOString());
    compare('CorrelationId', request.CorrelationId ?? null, existing.CorrelationId);
    compare('CausationId', request.CausationId ?? null, existing.CausationId);

    if (this.CanonicalJson(request.Payload) !== this.CanonicalJson(existing.Payload)) {
      mismatches.push('Payload');
    }

    if (mismatches.length > 0) {
      throw new ConflictException('Outbox message idempotency key was reused with different payload', {
        MessageId: existing.MessageId,
        Mismatches: mismatches,
      });
    }
  }

  private CanonicalJson(value: unknown): string {
    return JSON.stringify(this.SortJson(value));
  }

  private SortJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.SortJson(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, this.SortJson(item)]),
    );
  }
}
