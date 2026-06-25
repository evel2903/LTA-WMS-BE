import {
  ImportBatchDto,
  IntegrationReconciliationItemDto,
  IntegrationReconciliationRunDto,
  InterfaceMessageDto,
  OutboxMessageDto,
} from '@modules/Integration/Application/DTOs/IntegrationDtos';
import { ImportBatchEntity } from '@modules/Integration/Domain/Entities/ImportBatchEntity';
import { IntegrationReconciliationItemEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationItemEntity';
import { IntegrationReconciliationRunEntity } from '@modules/Integration/Domain/Entities/IntegrationReconciliationRunEntity';
import { InterfaceMessageEntity } from '@modules/Integration/Domain/Entities/InterfaceMessageEntity';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';

export class IntegrationDtoMapper {
  public static ToImportBatchDto(entity: ImportBatchEntity): ImportBatchDto {
    return {
      Id: entity.Id,
      BatchReference: entity.BatchReference,
      SourceSystem: entity.SourceSystem,
      TargetSystem: entity.TargetSystem,
      Status: entity.Status,
      MessageCount: entity.MessageCount,
      AcceptedCount: entity.AcceptedCount,
      DuplicateCount: entity.DuplicateCount,
      RejectedCount: entity.RejectedCount,
      CreatedAt: entity.CreatedAt,
      CreatedBy: entity.CreatedBy,
    };
  }

  public static ToInterfaceMessageDto(entity: InterfaceMessageEntity, isDuplicate = false): InterfaceMessageDto {
    return {
      Id: entity.Id,
      ImportBatchId: entity.ImportBatchId,
      MessageId: entity.MessageId,
      MessageType: entity.MessageType,
      Version: entity.Version,
      BusinessReference: entity.BusinessReference,
      SourceSystem: entity.SourceSystem,
      TargetSystem: entity.TargetSystem,
      WarehouseContext: entity.WarehouseContext,
      OwnerContext: entity.OwnerContext,
      EventTime: entity.EventTime,
      CorrelationId: entity.CorrelationId,
      CausationId: entity.CausationId,
      Payload: entity.Payload,
      MessageStatus: entity.MessageStatus,
      CreatedAt: entity.CreatedAt,
      CreatedBy: entity.CreatedBy,
      IsDuplicate: isDuplicate,
    };
  }

  public static ToOutboxMessageDto(entity: OutboxMessageEntity, isDuplicate = false): OutboxMessageDto {
    return {
      Id: entity.Id,
      SourceMessageId: entity.SourceMessageId,
      MessageId: entity.MessageId,
      EventType: entity.EventType,
      Version: entity.Version,
      BusinessReference: entity.BusinessReference,
      SourceSystem: entity.SourceSystem,
      TargetSystem: entity.TargetSystem,
      WarehouseContext: entity.WarehouseContext,
      OwnerContext: entity.OwnerContext,
      EventTime: entity.EventTime,
      CorrelationId: entity.CorrelationId,
      CausationId: entity.CausationId,
      Payload: entity.Payload,
      Status: entity.Status,
      AttemptCount: entity.AttemptCount,
      MaxAttempts: entity.MaxAttempts,
      NextRetryAt: entity.NextRetryAt,
      LastError: entity.LastError,
      FailureCategory: entity.FailureCategory,
      DeadLetterReason: entity.DeadLetterReason,
      DeadLetteredAt: entity.DeadLetteredAt,
      ResolutionAction: entity.ResolutionAction,
      ActionIdempotencyKey: entity.ActionIdempotencyKey,
      ActionPayloadHash: entity.ActionPayloadHash,
      ResolvedAt: entity.ResolvedAt,
      ResolvedBy: entity.ResolvedBy,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      CreatedAt: entity.CreatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedAt: entity.UpdatedAt,
      IsDuplicate: isDuplicate,
    };
  }

  public static ToReconciliationRunDto(
    entity: IntegrationReconciliationRunEntity,
    isDuplicate = false,
  ): IntegrationReconciliationRunDto {
    return {
      Id: entity.Id,
      BusinessReference: entity.BusinessReference,
      WarehouseId: entity.WarehouseId,
      OwnerId: entity.OwnerId,
      RunStatus: entity.RunStatus,
      SourceCounts: entity.SourceCounts,
      ItemCount: entity.ItemCount,
      MismatchCount: entity.MismatchCount,
      ExceptionCount: entity.ExceptionCount,
      IdempotencyKey: entity.IdempotencyKey,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      ResolvedAt: entity.ResolvedAt,
      ResolvedBy: entity.ResolvedBy,
      CreatedAt: entity.CreatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedAt: entity.UpdatedAt,
      IsDuplicate: isDuplicate,
    };
  }

  public static ToReconciliationItemDto(
    entity: IntegrationReconciliationItemEntity,
    isDuplicate = false,
  ): IntegrationReconciliationItemDto {
    return {
      Id: entity.Id,
      RunId: entity.RunId,
      ItemStatus: entity.ItemStatus,
      Severity: entity.Severity,
      MismatchType: entity.MismatchType,
      SourceType: entity.SourceType,
      SourceId: entity.SourceId,
      ExpectedSummary: entity.ExpectedSummary,
      ActualSummary: entity.ActualSummary,
      ExceptionCaseId: entity.ExceptionCaseId,
      OutboxMessageId: entity.OutboxMessageId,
      DeadLetterMessageId: entity.DeadLetterMessageId,
      ResolutionNote: entity.ResolutionNote,
      ApprovalRequestId: entity.ApprovalRequestId,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      ResolvedAt: entity.ResolvedAt,
      ResolvedBy: entity.ResolvedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      IsDuplicate: isDuplicate,
    };
  }
}
