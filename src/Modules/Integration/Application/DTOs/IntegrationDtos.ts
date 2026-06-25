import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';
import { DeadLetterActionType } from '@modules/Integration/Domain/Enums/DeadLetterActionType';
import { IntegrationReconciliationRunStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationRunStatus';
import { IntegrationReconciliationItemStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationItemStatus';
import { IntegrationReconciliationSeverity } from '@modules/Integration/Domain/Enums/IntegrationReconciliationSeverity';

export interface IntegrationEnvelopeDto {
  MessageId: string;
  MessageType: string;
  Version: string;
  BusinessReference: string;
  SourceSystem: string;
  TargetSystem: string;
  WarehouseContext: string;
  OwnerContext?: string | null;
  EventTime: Date;
  CorrelationId?: string | null;
  CausationId?: string | null;
  Payload: Record<string, unknown>;
}

export interface ImportIntegrationBatchDto {
  BatchReference?: string | null;
  Messages: IntegrationEnvelopeDto[];
}

export interface ImportBatchDto {
  Id: string;
  BatchReference: string | null;
  SourceSystem: string | null;
  TargetSystem: string | null;
  Status: ImportBatchStatus;
  MessageCount: number;
  AcceptedCount: number;
  DuplicateCount: number;
  RejectedCount: number;
  CreatedAt: Date;
  CreatedBy: string | null;
}

export interface InterfaceMessageDto {
  Id: string;
  ImportBatchId: string | null;
  MessageId: string;
  MessageType: string;
  Version: string;
  BusinessReference: string;
  SourceSystem: string;
  TargetSystem: string;
  WarehouseContext: string;
  OwnerContext: string | null;
  EventTime: Date;
  CorrelationId: string | null;
  CausationId: string | null;
  Payload: Record<string, unknown>;
  MessageStatus: InterfaceMessageStatus;
  CreatedAt: Date;
  CreatedBy: string | null;
  IsDuplicate: boolean;
}

export interface OutboxMessageDto {
  Id: string;
  SourceMessageId: string | null;
  MessageId: string;
  EventType: string;
  Version: string;
  BusinessReference: string;
  SourceSystem: string;
  TargetSystem: string;
  WarehouseContext: string;
  OwnerContext: string | null;
  EventTime: Date;
  CorrelationId: string | null;
  CausationId: string | null;
  Payload: Record<string, unknown>;
  Status: OutboxMessageStatus;
  AttemptCount: number;
  MaxAttempts: number;
  NextRetryAt: Date | null;
  LastError: string | null;
  FailureCategory: IntegrationFailureCategory | null;
  DeadLetterReason: string | null;
  DeadLetteredAt: Date | null;
  ResolutionAction: DeadLetterActionType | null;
  ActionIdempotencyKey: string | null;
  ActionPayloadHash: string | null;
  ResolvedAt: Date | null;
  ResolvedBy: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  CreatedAt: Date;
  CreatedBy: string | null;
  UpdatedAt: Date;
  IsDuplicate: boolean;
}

export interface RecordOutboxFailureDto {
  FailureCategory: IntegrationFailureCategory;
  ErrorMessage: string;
}

export interface DeadLetterActionDto {
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs: string[];
  IdempotencyKey?: string | null;
  ManualFixPayload?: Record<string, unknown> | null;
}

export interface CreateReconciliationRunDto {
  BusinessReference: string;
  WarehouseId: string;
  OwnerId?: string | null;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
}

export interface ResolveReconciliationItemDto {
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  ResolutionNote: string;
  ApprovalRequestId?: string | null;
  ImpactsInventory?: boolean;
  ImpactsFinance?: boolean;
}

export interface IntegrationReconciliationRunDto {
  Id: string;
  BusinessReference: string;
  WarehouseId: string;
  OwnerId: string | null;
  RunStatus: IntegrationReconciliationRunStatus;
  SourceCounts: Record<string, number>;
  ItemCount: number;
  MismatchCount: number;
  ExceptionCount: number;
  IdempotencyKey: string;
  ReasonCode: string;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ResolvedAt: Date | null;
  ResolvedBy: string | null;
  CreatedAt: Date;
  CreatedBy: string | null;
  UpdatedAt: Date;
  IsDuplicate: boolean;
}

export interface IntegrationReconciliationItemDto {
  Id: string;
  RunId: string;
  ItemStatus: IntegrationReconciliationItemStatus;
  Severity: IntegrationReconciliationSeverity;
  MismatchType: string;
  SourceType: string;
  SourceId: string | null;
  ExpectedSummary: Record<string, unknown> | null;
  ActualSummary: Record<string, unknown> | null;
  ExceptionCaseId: string | null;
  OutboxMessageId: string | null;
  DeadLetterMessageId: string | null;
  ResolutionNote: string | null;
  ApprovalRequestId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ResolvedAt: Date | null;
  ResolvedBy: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  IsDuplicate: boolean;
}

export interface ListReconciliationRunsResultDto {
  Items: IntegrationReconciliationRunDto[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface ListReconciliationItemsResultDto {
  Items: IntegrationReconciliationItemDto[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface ImportIntegrationBatchResultDto {
  ImportBatch: ImportBatchDto;
  Messages: InterfaceMessageDto[];
  OutboxMessages: OutboxMessageDto[];
}
