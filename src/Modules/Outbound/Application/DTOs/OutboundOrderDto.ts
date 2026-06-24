import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';

export interface OutboundOrderLineDto {
  Id: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  OrderedQuantity: number;
  ExternalLineReference: string | null;
  ValidationErrors: string[];
}

export interface OutboundOrderDto {
  Id: string;
  OrderNumber: string;
  SourceSystem: string;
  SourceReference: string;
  BusinessReference: string;
  CustomerId: string | null;
  CustomerSourceSystem: string | null;
  CustomerExternalReference: string | null;
  CustomerCode: string | null;
  ShipToReference: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  Priority: number | null;
  CutoffAt: Date | null;
  DocumentStatus: OutboundOrderStatus;
  ValidationErrors: string[];
  CoreFlowInstanceId: string | null;
  OutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IsDuplicate: boolean;
  Lines: OutboundOrderLineDto[];
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface ImportOutboundOrderLineDto {
  LineNumber: number;
  SkuId: string;
  UomId: string;
  OrderedQuantity: number;
  ExternalLineReference?: string | null;
}

export interface ImportOutboundOrderDto {
  SourceSystem: string;
  SourceReference: string;
  CustomerId?: string | null;
  CustomerSourceSystem?: string | null;
  CustomerExternalReference?: string | null;
  ShipToReference?: string | null;
  OwnerId: string;
  WarehouseId: string;
  Priority?: number | null;
  CutoffAt?: Date | string | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
  Lines: ImportOutboundOrderLineDto[];
}

export interface ListOutboundOrdersDto {
  Page?: number;
  PageSize?: number;
  SourceSystem?: string;
  SourceReference?: string;
  OwnerId?: string;
  WarehouseId?: string;
  CustomerId?: string;
  DocumentStatus?: OutboundOrderStatus;
}

export interface ReasonOutboundOrderDto {
  Id: string;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}
