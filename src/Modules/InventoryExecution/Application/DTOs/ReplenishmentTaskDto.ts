import { InventoryControlResultDto } from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';

export type InventoryReconciliationRetryStatus = 'PendingRetry' | 'Retrying' | 'DeadLetter' | 'Resolved';

export interface ReplenishmentTaskDto {
  Id: string;
  TaskCode: string;
  TaskStatus: ReplenishmentTaskStatus;
  TriggerType: ReplenishmentTriggerType;
  SourceBalanceId: string;
  SourceDimensionId: string;
  SourceLocationId: string;
  SourceLocationCode: string | null;
  SourceInventoryStatusCode: string;
  TargetLocationId: string;
  TargetLocationCode: string | null;
  TargetLocationProfileId: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string | null;
  UomCode: string | null;
  Quantity: number;
  ShortPickReference: string | null;
  Priority: number | null;
  WorkPoolCode: string | null;
  AssignedUserId: string | null;
  EligibilityDecisionJson: Record<string, unknown> | null;
  OutboxMessageId: string | null;
  ConfirmTransactionId: string | null;
  ConfirmMovementId: string | null;
  ConfirmOutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ReleasedAt: string | null;
  ConfirmedAt: string | null;
  CancelledAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface ReleaseReplenishmentTaskDto {
  TriggerType: ReplenishmentTriggerType;
  SourceBalanceId: string;
  TargetLocationId: string;
  Quantity: number;
  ShortPickReference?: string | null;
  Priority?: number | null;
  WorkPoolCode?: string | null;
  AssignedUserId?: string | null;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ConfirmReplenishmentTaskDto {
  TaskId: string;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface CancelReplenishmentTaskDto {
  TaskId: string;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ListReplenishmentTasksDto {
  Page?: number;
  PageSize?: number;
  WarehouseId?: string;
  OwnerId?: string;
  TaskStatus?: ReplenishmentTaskStatus;
  TriggerType?: ReplenishmentTriggerType;
}

export interface ListReplenishmentTasksResultDto {
  Items: ReplenishmentTaskDto[];
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}

export interface ReplenishmentMutationResultDto {
  ReplenishmentTask: ReplenishmentTaskDto;
  InventoryControl?: InventoryControlResultDto | null;
  OutboxMessageId?: string | null;
  EventType?: 'ReplenishmentTaskReleased' | 'ReplenishmentTaskCancelled' | null;
  IsDuplicate: boolean;
}

export interface RecordInventoryReconciliationFailureDto {
  BusinessReference: string;
  EventType: string;
  WarehouseId: string;
  OwnerId?: string | null;
  ErrorMessage: string;
  RetryStatus: InventoryReconciliationRetryStatus;
  ReasonCode?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
  Payload?: Record<string, unknown> | null;
}

export interface InventoryReconciliationFailureResultDto {
  BusinessReference: string;
  EventType: string;
  ErrorMessage: string;
  RetryStatus: InventoryReconciliationRetryStatus;
  WarehouseId: string;
  OwnerId: string | null;
  OutboxMessageId: string;
  ExceptionCaseId: string | null;
  IsDuplicate: boolean;
}
