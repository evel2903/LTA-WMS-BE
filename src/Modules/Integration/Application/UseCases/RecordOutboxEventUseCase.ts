import { randomUUID } from 'crypto';
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
    if (existing) return IntegrationDtoMapper.ToOutboxMessageDto(existing, true);

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
      return IntegrationDtoMapper.ToOutboxMessageDto(await write());
    }

    return this.auditedTransaction.Run(async (manager) => {
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
  }
}
