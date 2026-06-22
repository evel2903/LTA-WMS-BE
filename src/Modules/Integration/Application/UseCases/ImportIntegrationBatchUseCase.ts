import { randomUUID } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  ImportIntegrationBatchDto,
  ImportIntegrationBatchResultDto,
} from '@modules/Integration/Application/DTOs/IntegrationDtos';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';
import { IntegrationEnvelopeValidation } from '@modules/Integration/Application/UseCases/IntegrationEnvelopeValidation';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

export class ImportIntegrationBatchUseCase {
  constructor(
    private readonly integrations: IIntegrationRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: ImportIntegrationBatchDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ImportIntegrationBatchResultDto> {
    if (!request.Messages || request.Messages.length === 0) {
      throw new BusinessRuleException('Integration import requires at least one message');
    }
    for (const message of request.Messages) IntegrationEnvelopeValidation.Validate(message);

    const now = new Date();
    const batchId = randomUUID();
    const duplicateMessages: InterfaceMessageEntity[] = [];
    const newMessages: InterfaceMessageEntity[] = [];
    const newOutboxMessages: OutboxMessageEntity[] = [];
    const pendingMessagesByMessageId = new Map<string, InterfaceMessageEntity>();

    for (const message of request.Messages) {
      const pending = pendingMessagesByMessageId.get(message.MessageId);
      if (pending) {
        duplicateMessages.push(pending);
        continue;
      }

      const existing = await this.integrations.FindInterfaceMessageByMessageId(message.MessageId);
      if (existing) {
        duplicateMessages.push(existing);
        continue;
      }

      const interfaceMessage = new InterfaceMessageEntity({
        Id: randomUUID(),
        ImportBatchId: batchId,
        MessageId: message.MessageId,
        MessageType: message.MessageType,
        Version: message.Version,
        BusinessReference: message.BusinessReference,
        SourceSystem: message.SourceSystem,
        TargetSystem: message.TargetSystem,
        WarehouseContext: message.WarehouseContext,
        OwnerContext: message.OwnerContext ?? null,
        EventTime: message.EventTime,
        CorrelationId: message.CorrelationId ?? null,
        CausationId: message.CausationId ?? null,
        Payload: message.Payload,
        MessageStatus: InterfaceMessageStatus.Accepted,
        CreatedAt: now,
        CreatedBy: context.ActorUserId,
      });
      newMessages.push(interfaceMessage);
      pendingMessagesByMessageId.set(message.MessageId, interfaceMessage);
      newOutboxMessages.push(
        new OutboxMessageEntity({
          Id: randomUUID(),
          SourceMessageId: interfaceMessage.Id,
          MessageId: message.MessageId,
          EventType: message.MessageType,
          Version: message.Version,
          BusinessReference: message.BusinessReference,
          SourceSystem: message.SourceSystem,
          TargetSystem: message.TargetSystem,
          WarehouseContext: message.WarehouseContext,
          OwnerContext: message.OwnerContext ?? null,
          EventTime: message.EventTime,
          CorrelationId: message.CorrelationId ?? null,
          CausationId: message.CausationId ?? null,
          Payload: message.Payload,
          Status: OutboxMessageStatus.Pending,
          CreatedAt: now,
          CreatedBy: context.ActorUserId,
        }),
      );
    }

    const firstNew = newMessages[0];
    const firstDuplicate = duplicateMessages[0];
    const importBatch = new ImportBatchEntity({
      Id: batchId,
      BatchReference: request.BatchReference ?? null,
      SourceSystem: firstNew?.SourceSystem ?? firstDuplicate?.SourceSystem ?? null,
      TargetSystem: firstNew?.TargetSystem ?? firstDuplicate?.TargetSystem ?? null,
      Status: newMessages.length > 0 ? ImportBatchStatus.Completed : ImportBatchStatus.DuplicateOnly,
      MessageCount: request.Messages.length,
      AcceptedCount: newMessages.length,
      DuplicateCount: duplicateMessages.length,
      RejectedCount: 0,
      CreatedAt: now,
      CreatedBy: context.ActorUserId,
    });

    const toResult = (saved: {
      ImportBatch: ImportBatchEntity;
      InterfaceMessages: InterfaceMessageEntity[];
      OutboxMessages: OutboxMessageEntity[];
    }): ImportIntegrationBatchResultDto => ({
      ImportBatch: IntegrationDtoMapper.ToImportBatchDto(saved.ImportBatch),
      Messages: [
        ...saved.InterfaceMessages.map((message) => IntegrationDtoMapper.ToInterfaceMessageDto(message)),
        ...duplicateMessages.map((message) => IntegrationDtoMapper.ToInterfaceMessageDto(message, true)),
      ],
      OutboxMessages: saved.OutboxMessages.map((message) => IntegrationDtoMapper.ToOutboxMessageDto(message)),
    });

    const write = async (manager?: Parameters<IIntegrationRepository['CreateImport']>[3]) =>
      this.integrations.CreateImport(importBatch, newMessages, newOutboxMessages, manager);

    if (!this.auditedTransaction) {
      return toResult(await write());
    }

    return this.auditedTransaction.Run(async (manager) => {
      const saved = await write(manager);
      const result = toResult(saved);
      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Create,
          ObjectType: ObjectType.IntegrationMessage,
          ObjectId: importBatch.Id,
          ObjectCode: importBatch.BatchReference ?? importBatch.Id,
          BeforeJson: null,
          AfterJson: {
            ImportBatch: result.ImportBatch,
            AcceptedCount: importBatch.AcceptedCount,
            DuplicateCount: importBatch.DuplicateCount,
          },
          ReasonCodeId: null,
          ReasonNote: null,
          WarehouseId: null,
          OwnerId: null,
          ReferenceType: 'ImportBatch',
          ReferenceId: importBatch.Id,
        }),
      };
    });
  }
}
