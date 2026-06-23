import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';

export interface PutawayTaskDto {
  Id: string;
  TaskCode: string;
  TaskStatus: PutawayTaskStatus;
  InboundPutawayReleaseId: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  InboundLpnId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  LpnCode: string | null;
  SsccCode: string | null;
  InventoryStatusCode: string;
  SourceLocationId: string | null;
  SourceLocationCode: string | null;
  TargetLocationId: string;
  TargetLocationCode: string;
  TargetLocationProfileId: string | null;
  Priority: number;
  WorkPoolCode: string | null;
  AssignedUserId: string | null;
  ConstraintJson: Record<string, unknown> | null;
  EligibilityDecisionJson: Record<string, unknown> | null;
  OutboxMessageId: string | null;
  MobileTaskId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  ReleasedAt: string;
  ReleasedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ReleasePutawayTaskDto {
  InboundPutawayReleaseId: string;
  SourceLocationId?: string | null;
  SourceLocationCode?: string | null;
  TargetLocationId?: string | null;
  Priority?: number;
  WorkPoolCode?: string | null;
  AssignedUserId?: string | null;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ListPutawayTasksDto {
  Page?: number;
  PageSize?: number;
  WarehouseId?: string;
  OwnerId?: string;
  TaskStatus?: PutawayTaskStatus;
  InboundPutawayReleaseId?: string;
}
