import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { ReceiptDocumentStatus } from '@modules/Inbound/Domain/Enums/ReceiptDocumentStatus';
import { ReceiptLineDiscrepancySignal } from '@modules/Inbound/Domain/Enums/ReceiptLineDiscrepancySignal';
import { ReceiptLineStatus } from '@modules/Inbound/Domain/Enums/ReceiptLineStatus';
import { ReceivingSessionStatus } from '@modules/Inbound/Domain/Enums/ReceivingSessionStatus';

export interface InboundPlanLineDto {
  Id: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ExpectedQuantity: number;
  ExternalLineReference: string | null;
}

export interface InboundPlanDto {
  Id: string;
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  BusinessReference: string;
  SupplierId: string;
  SupplierCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  WarehouseProfileId: string | null;
  ExpectedArrivalAt: Date | null;
  Status: InboundPlanDocumentStatus;
  GateInStatus: InboundGateInStatus;
  GateInAt: Date | null;
  GateReference: string | null;
  VehicleNumber: string | null;
  DriverName: string | null;
  EvidenceRefs: string[];
  CoreFlowInstanceId: string | null;
  IsDuplicate: boolean;
  Lines: InboundPlanLineDto[];
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface CreateInboundPlanLineDto {
  LineNumber: number;
  SkuId: string;
  UomId: string;
  ExpectedQuantity: number;
  ExternalLineReference?: string | null;
}

export interface CreateInboundPlanDto {
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  SupplierId: string;
  OwnerId: string;
  WarehouseId: string;
  WarehouseProfileId?: string | null;
  ExpectedArrivalAt?: Date | string | null;
  Lines: CreateInboundPlanLineDto[];
}

export interface ListInboundPlansDto {
  Page?: number;
  PageSize?: number;
  SourceSystem?: string;
  SourceDocumentNumber?: string;
  OwnerId?: string;
  WarehouseId?: string;
  Status?: InboundPlanDocumentStatus;
}

export interface RecordGateInDto {
  Id: string;
  GateInAt: Date | string;
  GateReference: string;
  VehicleNumber?: string | null;
  DriverName?: string | null;
  EvidenceRefs?: string[];
}

export interface ValidateReceivingReadinessDto {
  Id: string;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface ReceivingReadinessDto {
  Allowed: boolean;
  Blocked: boolean;
  Decision: 'Allowed' | 'Blocked' | 'OverrideAccepted';
  GateInRequired: boolean;
  GateInRecorded: boolean;
  OverrideAccepted: boolean;
  Reason: string;
  InboundPlanId: string;
  BusinessReference: string;
}

export interface StartReceivingSessionDto {
  InboundPlanId: string;
  SessionKey?: string | null;
  DeviceCode?: string | null;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface ReceivingSessionDto {
  Id: string;
  InboundPlanId: string;
  ReceiptId: string;
  ReceiptNumber: string;
  SessionKey: string;
  DeviceCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  Status: ReceivingSessionStatus;
  StartedAt: Date;
  ClosedAt: Date | null;
  IsDuplicate: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
  StartedBy: string | null;
  UpdatedBy: string | null;
}

export interface ReceiptDto {
  Id: string;
  InboundPlanId: string;
  ReceiptNumber: string;
  BusinessReference: string;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  Status: ReceiptDocumentStatus;
  CoreFlowInstanceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface ReceiptLineScanEvidenceDto {
  RawValue?: string | null;
  ParsedValue?: Record<string, unknown> | null;
  ScanEventId?: string | null;
  ScanType?: string | null;
  ScanResult?: string | null;
  ResolvedSkuId?: string | null;
  ResolvedUomId?: string | null;
  ResolvedPackId?: string | null;
  LotNumber?: string | null;
  ExpiryDate?: string | null;
  SerialNumber?: string | null;
  Lpn?: string | null;
}

export interface ConfirmReceiptLineDto {
  ReceiptId: string;
  InboundPlanLineId: string;
  ActualQuantity: number;
  SkuId?: string | null;
  UomId?: string | null;
  ManualConfirm?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  IdempotencyKey: string;
  ScanEvidence?: ReceiptLineScanEvidenceDto | null;
}

export interface ReceiptLineDto {
  Id: string;
  ReceiptId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ExpectedQuantity: number;
  ActualQuantity: number;
  Status: ReceiptLineStatus;
  ManualConfirm: boolean;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  ScanEvidenceJson: Record<string, unknown> | null;
  DiscrepancySignals: ReceiptLineDiscrepancySignal[];
  IdempotencyKey: string;
  ReceivedAt: Date;
  ReceivedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}
