import { PickReleaseMode } from '@modules/Outbound/Domain/Enums/PickReleaseMode';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';

export interface PickTaskDto {
  Id: string;
  PickReleaseId: string;
  OutboundOrderId: string;
  AllocationId: string;
  AllocationLineId: string;
  OutboundOrderLineId: string;
  TaskNumber: string;
  Status: PickTaskStatus;
  Sequence: number;
  BatchNumber: string | null;
  SourceBalanceId: string;
  SourceDimensionId: string;
  SourceLocationId: string;
  TargetLocationId: string | null;
  TargetReference: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  InventoryStatusCode: string | null;
  LotNumber: string | null;
  SerialNumber: string | null;
  ExpiryDate: Date | null;
  CreatedAt: Date;
}

export interface PickReleaseDto {
  Id: string;
  ReleaseNumber: string;
  OutboundOrderId: string;
  AllocationId: string;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  ReleaseMode: PickReleaseMode;
  BatchSize: number;
  Status: PickReleaseStatus;
  BlockReason: string | null;
  TotalTaskCount: number;
  TotalReleasedQuantity: number;
  OutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IsDuplicate: boolean;
  Tasks: PickTaskDto[];
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface ReleaseOutboundOrderDto {
  OutboundOrderId: string;
  ReleaseMode?: PickReleaseMode | string | null;
  BatchSize?: number | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ListPickReleasesDto {
  OutboundOrderId: string;
  Page?: number;
  PageSize?: number;
  Status?: PickReleaseStatus;
}
