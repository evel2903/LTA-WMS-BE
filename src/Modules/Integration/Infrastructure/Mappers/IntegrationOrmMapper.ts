import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { IntegrationReconciliationItemEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationItemEntity';
import { IntegrationReconciliationRunEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationRunEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import { IntegrationReconciliationItemStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationItemStatus';
import { IntegrationReconciliationRunStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationRunStatus';
import { IntegrationReconciliationSeverity } from '@modules/Integration/Domain/Enums/IntegrationReconciliationSeverity';
import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';
import { DeadLetterActionType } from '@modules/Integration/Domain/Enums/DeadLetterActionType';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { IntegrationReconciliationItemOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationItemOrmEntity';
import { IntegrationReconciliationRunOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationRunOrmEntity';
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
    orm.AttemptCount = entity.AttemptCount;
    orm.MaxAttempts = entity.MaxAttempts;
    orm.NextRetryAt = entity.NextRetryAt;
    orm.LastError = entity.LastError;
    orm.FailureCategory = entity.FailureCategory;
    orm.DeadLetterReason = entity.DeadLetterReason;
    orm.DeadLetteredAt = entity.DeadLetteredAt;
    orm.ResolutionAction = entity.ResolutionAction;
    orm.ActionIdempotencyKey = entity.ActionIdempotencyKey;
    orm.ActionPayloadHash = entity.ActionPayloadHash;
    orm.ResolvedAt = entity.ResolvedAt;
    orm.ResolvedBy = entity.ResolvedBy;
    orm.ReasonCode = entity.ReasonCode;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.ReasonNote = entity.ReasonNote;
    orm.EvidenceRefs = entity.EvidenceRefs;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedAt = entity.UpdatedAt;
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
      AttemptCount: orm.AttemptCount ?? 0,
      MaxAttempts: orm.MaxAttempts ?? 5,
      NextRetryAt: orm.NextRetryAt,
      LastError: orm.LastError,
      FailureCategory: orm.FailureCategory as IntegrationFailureCategory | null,
      DeadLetterReason: orm.DeadLetterReason,
      DeadLetteredAt: orm.DeadLetteredAt,
      ResolutionAction: orm.ResolutionAction as DeadLetterActionType | null,
      ActionIdempotencyKey: orm.ActionIdempotencyKey,
      ActionPayloadHash: orm.ActionPayloadHash,
      ResolvedAt: orm.ResolvedAt,
      ResolvedBy: orm.ResolvedBy,
      ReasonCode: orm.ReasonCode,
      ReasonCodeId: orm.ReasonCodeId,
      ReasonNote: orm.ReasonNote,
      EvidenceRefs: orm.EvidenceRefs ?? [],
      CreatedAt: orm.CreatedAt,
      CreatedBy: orm.CreatedBy,
      UpdatedAt: orm.UpdatedAt ?? orm.CreatedAt,
    });
  }

  public static ToReconciliationRunOrm(
    entity: IntegrationReconciliationRunEntity,
  ): IntegrationReconciliationRunOrmEntity {
    const orm = new IntegrationReconciliationRunOrmEntity();
    orm.Id = entity.Id;
    orm.BusinessReference = entity.BusinessReference;
    orm.WarehouseId = entity.WarehouseId;
    orm.OwnerId = entity.OwnerId ?? '';
    orm.RunStatus = entity.RunStatus;
    orm.SourceCounts = entity.SourceCounts;
    orm.ItemCount = entity.ItemCount;
    orm.MismatchCount = entity.MismatchCount;
    orm.ExceptionCount = entity.ExceptionCount;
    orm.IdempotencyKey = entity.IdempotencyKey;
    orm.RequestPayloadHash = entity.RequestPayloadHash;
    orm.ReasonCode = entity.ReasonCode;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.ReasonNote = entity.ReasonNote;
    orm.EvidenceRefs = entity.EvidenceRefs;
    orm.ResolvedAt = entity.ResolvedAt;
    orm.ResolvedBy = entity.ResolvedBy;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedAt = entity.UpdatedAt;
    return orm;
  }

  public static ToReconciliationRunDomain(
    orm: IntegrationReconciliationRunOrmEntity,
  ): IntegrationReconciliationRunEntity {
    return new IntegrationReconciliationRunEntity({
      Id: orm.Id,
      BusinessReference: orm.BusinessReference,
      WarehouseId: orm.WarehouseId,
      OwnerId: orm.OwnerId || null,
      RunStatus: orm.RunStatus as IntegrationReconciliationRunStatus,
      SourceCounts: orm.SourceCounts ?? {},
      ItemCount: orm.ItemCount ?? 0,
      MismatchCount: orm.MismatchCount ?? 0,
      ExceptionCount: orm.ExceptionCount ?? 0,
      IdempotencyKey: orm.IdempotencyKey,
      RequestPayloadHash: orm.RequestPayloadHash,
      ReasonCode: orm.ReasonCode,
      ReasonCodeId: orm.ReasonCodeId,
      ReasonNote: orm.ReasonNote,
      EvidenceRefs: orm.EvidenceRefs ?? [],
      ResolvedAt: orm.ResolvedAt,
      ResolvedBy: orm.ResolvedBy,
      CreatedAt: orm.CreatedAt,
      CreatedBy: orm.CreatedBy,
      UpdatedAt: orm.UpdatedAt,
    });
  }

  public static ToReconciliationItemOrm(
    entity: IntegrationReconciliationItemEntity,
  ): IntegrationReconciliationItemOrmEntity {
    const orm = new IntegrationReconciliationItemOrmEntity();
    orm.Id = entity.Id;
    orm.RunId = entity.RunId;
    orm.ItemStatus = entity.ItemStatus;
    orm.Severity = entity.Severity;
    orm.MismatchType = entity.MismatchType;
    orm.SourceType = entity.SourceType;
    orm.SourceId = entity.SourceId;
    orm.ExpectedSummary = entity.ExpectedSummary;
    orm.ActualSummary = entity.ActualSummary;
    orm.ExceptionCaseId = entity.ExceptionCaseId;
    orm.OutboxMessageId = entity.OutboxMessageId;
    orm.DeadLetterMessageId = entity.DeadLetterMessageId;
    orm.ResolutionNote = entity.ResolutionNote;
    orm.ResolutionIdempotencyKey = entity.ResolutionIdempotencyKey;
    orm.ResolutionPayloadHash = entity.ResolutionPayloadHash;
    orm.ApprovalRequestId = entity.ApprovalRequestId;
    orm.ReasonCode = entity.ReasonCode;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.ReasonNote = entity.ReasonNote;
    orm.EvidenceRefs = entity.EvidenceRefs;
    orm.ResolvedAt = entity.ResolvedAt;
    orm.ResolvedBy = entity.ResolvedBy;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    return orm;
  }

  public static ToReconciliationItemDomain(
    orm: IntegrationReconciliationItemOrmEntity,
  ): IntegrationReconciliationItemEntity {
    return new IntegrationReconciliationItemEntity({
      Id: orm.Id,
      RunId: orm.RunId,
      ItemStatus: orm.ItemStatus as IntegrationReconciliationItemStatus,
      Severity: orm.Severity as IntegrationReconciliationSeverity,
      MismatchType: orm.MismatchType,
      SourceType: orm.SourceType,
      SourceId: orm.SourceId,
      ExpectedSummary: orm.ExpectedSummary,
      ActualSummary: orm.ActualSummary,
      ExceptionCaseId: orm.ExceptionCaseId,
      OutboxMessageId: orm.OutboxMessageId,
      DeadLetterMessageId: orm.DeadLetterMessageId,
      ResolutionNote: orm.ResolutionNote,
      ResolutionIdempotencyKey: orm.ResolutionIdempotencyKey,
      ResolutionPayloadHash: orm.ResolutionPayloadHash,
      ApprovalRequestId: orm.ApprovalRequestId,
      ReasonCode: orm.ReasonCode,
      ReasonCodeId: orm.ReasonCodeId,
      ReasonNote: orm.ReasonNote,
      EvidenceRefs: orm.EvidenceRefs ?? [],
      ResolvedAt: orm.ResolvedAt,
      ResolvedBy: orm.ResolvedBy,
      CreatedAt: orm.CreatedAt,
      UpdatedAt: orm.UpdatedAt,
    });
  }
}
