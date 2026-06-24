import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';

export interface AllocationLineDto {
  Id: string;
  OutboundOrderLineId: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  OrderedQuantity: number;
  AllocatedQuantity: number;
  BackorderedQuantity: number;
  SourceBalanceId: string | null;
  SourceDimensionId: string | null;
  SourceLocationId: string | null;
  InventoryStatusCode: string | null;
  LotNumber: string | null;
  SerialNumber: string | null;
  ExpiryDate: Date | null;
  Status: AllocationStatus;
  ShortageReason: string | null;
}

export interface AllocationDto {
  Id: string;
  AllocationNumber: string;
  OutboundOrderId: string;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  Policy: AllocationPolicy;
  Status: AllocationStatus;
  TotalOrderedQuantity: number;
  TotalAllocatedQuantity: number;
  TotalBackorderedQuantity: number;
  ShortageReason: string | null;
  OutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IsDuplicate: boolean;
  Lines: AllocationLineDto[];
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface AllocateOutboundOrderDto {
  OutboundOrderId: string;
  Policy?: AllocationPolicy | string | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ListAllocationsDto {
  OutboundOrderId: string;
  Page?: number;
  PageSize?: number;
  Status?: AllocationStatus;
}
