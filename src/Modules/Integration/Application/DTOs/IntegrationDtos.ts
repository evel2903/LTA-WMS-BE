import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';
import { DeadLetterActionType } from '@modules/Integration/Domain/Enums/DeadLetterActionType';

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

export interface ImportIntegrationBatchResultDto {
  ImportBatch: ImportBatchDto;
  Messages: InterfaceMessageDto[];
  OutboxMessages: OutboxMessageDto[];
}
