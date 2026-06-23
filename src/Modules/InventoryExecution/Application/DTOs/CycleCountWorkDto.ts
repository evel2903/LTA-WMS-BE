import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CycleCountWorkStatus } from '@modules/InventoryExecution/Domain/Enums/CycleCountWorkStatus';
import {
  InventoryBalanceSnapshotDto,
  InventoryControlResultDto,
  InventoryMovementDto,
  InventoryTransactionDto,
} from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';

export interface CycleCountWorkDto {
  Id: string;
  CountCode: string;
  WorkStatus: CycleCountWorkStatus;
  SourceBalanceId: string;
  LockedBalanceId: string | null;
  OriginalInventoryStatusCode: string;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  LocationId: string;
  LocationCode: string | null;
  UomId: string | null;
  UomCode: string | null;
  LpnCode: string | null;
  ExpectedQuantity: number;
  CountedQuantity: number | null;
  VarianceQuantity: number | null;
  ToleranceQuantity: number;
  ApprovalRequestId: string | null;
  LockTransactionId: string | null;
  AdjustmentTransactionId: string | null;
  UnlockTransactionId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface CreateCycleCountWorkDto {
  SourceBalanceId: string;
  Quantity: number;
  ToleranceQuantity?: number | null;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ListCycleCountWorksDto {
  Page?: number;
  PageSize?: number;
  WarehouseId?: string;
  OwnerId?: string;
  WorkStatus?: CycleCountWorkStatus;
  ActorUserId?: string | null;
}

export interface ListCycleCountWorksResultDto {
  Items: CycleCountWorkDto[];
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}

export interface SubmitCycleCountWorkDto {
  WorkId: string;
  CountedQuantity: number;
  ApprovalRequestId?: string | null;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface RecountCycleCountWorkDto {
  WorkId: string;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface PostCycleCountAdjustmentDto {
  WorkId: string;
  ApprovalRequestId?: string | null;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface UnlockCycleCountWorkDto {
  WorkId: string;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface CycleCountMutationResultDto {
  CycleCountWork: CycleCountWorkDto;
  InventoryControl?: InventoryControlResultDto | null;
  IsDuplicate: boolean;
}

export interface CycleCountAdjustmentResultDto {
  CycleCountWork: CycleCountWorkDto;
  InventoryTransaction: InventoryTransactionDto;
  InventoryMovement: InventoryMovementDto;
  SourceBalance: InventoryBalanceSnapshotDto;
  TargetBalance: InventoryBalanceSnapshotDto;
  OutboxMessageId: string | null;
  EventType: 'AdjustmentPosted';
  IsDuplicate: boolean;
}

export interface CycleCountCommandContext {
  Request:
    | CreateCycleCountWorkDto
    | SubmitCycleCountWorkDto
    | RecountCycleCountWorkDto
    | PostCycleCountAdjustmentDto
    | UnlockCycleCountWorkDto;
  Audit: AuditContext;
}
