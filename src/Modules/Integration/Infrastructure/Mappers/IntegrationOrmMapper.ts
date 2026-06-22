import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';

export class IntegrationOrmMapper {
  public static ToImportBatchOrm(entity: ImportBatchEntity): ImportBatchOrmEntity {
    const orm = new ImportBatchOrmEntity();
    orm.Id = entity.Id;
    orm.BatchReference = entity.BatchReference;
    orm.SourceSystem = entity.SourceSystem;
    orm.TargetSystem = entity.TargetSystem;
    orm.Status = entity.Status;
    orm.MessageCount = entity.MessageCount;
    orm.AcceptedCount = entity.AcceptedCount;
    orm.DuplicateCount = entity.DuplicateCount;
    orm.RejectedCount = entity.RejectedCount;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }

  public static ToImportBatchDomain(orm: ImportBatchOrmEntity): ImportBatchEntity {
    return new ImportBatchEntity({
      Id: orm.Id,
      BatchReference: orm.BatchReference,
      SourceSystem: orm.SourceSystem,
      TargetSystem: orm.TargetSystem,
      Status: orm.Status as ImportBatchStatus,
      MessageCount: orm.MessageCount,
      AcceptedCount: orm.AcceptedCount,
      DuplicateCount: orm.DuplicateCount,
      RejectedCount: orm.RejectedCount,
      CreatedAt: orm.CreatedAt,
      CreatedBy: orm.CreatedBy,
    });
  }

  public static ToInterfaceMessageOrm(entity: InterfaceMessageEntity): InterfaceMessageOrmEntity {
    const orm = new InterfaceMessageOrmEntity();
    orm.Id = entity.Id;
    orm.ImportBatchId = entity.ImportBatchId;
    orm.MessageId = entity.MessageId;
    orm.MessageType = entity.MessageType;
    orm.Version = entity.Version;
    orm.BusinessReference = entity.BusinessReference;
    orm.SourceSystem = entity.SourceSystem;
    orm.TargetSystem = entity.TargetSystem;
    orm.WarehouseContext = entity.WarehouseContext;
    orm.OwnerContext = entity.OwnerContext;
    orm.EventTime = entity.EventTime;
    orm.CorrelationId = entity.CorrelationId;
    orm.CausationId = entity.CausationId;
    orm.Payload = entity.Payload;
    orm.MessageStatus = entity.MessageStatus;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }

  public static ToInterfaceMessageDomain(orm: InterfaceMessageOrmEntity): InterfaceMessageEntity {
    return new InterfaceMessageEntity({
      Id: orm.Id,
      ImportBatchId: orm.ImportBatchId,
      MessageId: orm.MessageId,
      MessageType: orm.MessageType,
      Version: orm.Version,
      BusinessReference: orm.BusinessReference,
      SourceSystem: orm.SourceSystem,
      TargetSystem: orm.TargetSystem,
      WarehouseContext: orm.WarehouseContext,
      OwnerContext: orm.OwnerContext,
      EventTime: orm.EventTime,
      CorrelationId: orm.CorrelationId,
      CausationId: orm.CausationId,
      Payload: orm.Payload,
      MessageStatus: orm.MessageStatus as InterfaceMessageStatus,
      CreatedAt: orm.CreatedAt,
      CreatedBy: orm.CreatedBy,
    });
  }

  public static ToOutboxMessageOrm(entity: OutboxMessageEntity): OutboxMessageOrmEntity {
    const orm = new OutboxMessageOrmEntity();
    orm.Id = entity.Id;
    orm.SourceMessageId = entity.SourceMessageId;
    orm.MessageId = entity.MessageId;
    orm.EventType = entity.EventType;
    orm.Version = entity.Version;
    orm.BusinessReference = entity.BusinessReference;
    orm.SourceSystem = entity.SourceSystem;
    orm.TargetSystem = entity.TargetSystem;
    orm.WarehouseContext = entity.WarehouseContext;
    orm.OwnerContext = entity.OwnerContext;
    orm.EventTime = entity.EventTime;
    orm.CorrelationId = entity.CorrelationId;
    orm.CausationId = entity.CausationId;
    orm.Payload = entity.Payload;
    orm.Status = entity.Status;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }

  public static ToOutboxMessageDomain(orm: OutboxMessageOrmEntity): OutboxMessageEntity {
    return new OutboxMessageEntity({
      Id: orm.Id,
      SourceMessageId: orm.SourceMessageId,
      MessageId: orm.MessageId,
      EventType: orm.EventType,
      Version: orm.Version,
      BusinessReference: orm.BusinessReference,
      SourceSystem: orm.SourceSystem,
      TargetSystem: orm.TargetSystem,
      WarehouseContext: orm.WarehouseContext,
      OwnerContext: orm.OwnerContext,
      EventTime: orm.EventTime,
      CorrelationId: orm.CorrelationId,
      CausationId: orm.CausationId,
      Payload: orm.Payload,
      Status: orm.Status as OutboxMessageStatus,
      CreatedAt: orm.CreatedAt,
      CreatedBy: orm.CreatedBy,
    });
  }
}
