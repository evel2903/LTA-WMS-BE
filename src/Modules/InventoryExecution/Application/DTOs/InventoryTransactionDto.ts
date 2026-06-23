import { PutawayTaskDto } from '@modules/InventoryExecution/Application/DTOs/PutawayTaskDto';
import { InventoryMovementStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryMovementStatus';
import { InventoryTransactionStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionStatus';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';

export interface InventoryTransactionDto {
  Id: string;
  TransactionCode: string;
  TransactionType: InventoryTransactionType;
  TransactionStatus: InventoryTransactionStatus;
  PutawayTaskId: string | null;
  PutawayTaskCode: string | null;
  InventoryMovementId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string | null;
  UomCode: string | null;
  Quantity: number;
  FromInventoryStatusCode: string;
  ToInventoryStatusCode: string;
  FromLocationId: string | null;
  FromLocationCode: string | null;
  ToLocationId: string;
  ToLocationCode: string;
  LpnCode: string | null;
  SsccCode: string | null;
  IdempotencyKey: string;
  OutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  PostedAt: string;
  PostedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface InventoryMovementDto {
  Id: string;
  MovementCode: string;
  MovementStatus: InventoryMovementStatus;
  InventoryTransactionId: string;
  PutawayTaskId: string | null;
  PutawayTaskCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string | null;
  UomCode: string | null;
  Quantity: number;
  FromDimensionId: string;
  FromBalanceId: string;
  FromLocationId: string | null;
  FromLocationCode: string | null;
  FromInventoryStatusCode: string;
  ToDimensionId: string;
  ToBalanceId: string;
  ToLocationId: string;
  ToLocationCode: string;
  ToInventoryStatusCode: string;
  LpnCode: string | null;
  SsccCode: string | null;
  ScanEvidenceJson: Record<string, unknown>;
  CreatedAt: string;
  CreatedBy: string | null;
}

export interface InventoryBalanceSnapshotDto {
  BalanceId: string;
  DimensionId: string;
  QtyOnHand: number;
  QtyReserved: number;
  QtyAvailable: number;
}

export interface PutawayConfirmScanDto {
  ScanType: string;
  RawValue: string;
  ExpectedValue: string | null;
  Result: string;
}

export interface ConfirmPutawayTaskDto {
  SourceLocationScan: string;
  TargetLocationScan: string;
  LpnScan?: string | null;
  ConfirmedQuantity?: number | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  DeviceCode?: string | null;
  SessionId?: string | null;
  IdempotencyKey: string;
}

export interface ConfirmPutawayTaskResultDto {
  PutawayTask: PutawayTaskDto;
  InventoryTransaction: InventoryTransactionDto;
  InventoryMovement: InventoryMovementDto;
  SourceBalance: InventoryBalanceSnapshotDto;
  TargetBalance: InventoryBalanceSnapshotDto;
  ScanResults: PutawayConfirmScanDto[];
  OutboxMessageId: string | null;
  IsDuplicate: boolean;
}

export interface InventoryControlResultDto {
  InventoryTransaction: InventoryTransactionDto;
  InventoryMovement: InventoryMovementDto;
  SourceBalance: InventoryBalanceSnapshotDto;
  TargetBalance: InventoryBalanceSnapshotDto;
  OutboxMessageId: string | null;
  EventType: 'InventoryStatusChanged' | 'InventoryMoved';
  IsDuplicate: boolean;
}
