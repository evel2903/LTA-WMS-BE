import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';
import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

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
  CreatedAt: Date;
  CreatedBy: string | null;
  IsDuplicate: boolean;
}

export interface ImportIntegrationBatchResultDto {
  ImportBatch: ImportBatchDto;
  Messages: InterfaceMessageDto[];
  OutboxMessages: OutboxMessageDto[];
}
