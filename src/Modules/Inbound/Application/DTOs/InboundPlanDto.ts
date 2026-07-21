import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { InboundDiscrepancyStatus } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyStatus';
import { InboundDiscrepancyToleranceDecision } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyToleranceDecision';
import { InboundDiscrepancyType } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyType';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { QcDispositionCode } from '@modules/Inbound/Domain/Enums/QcDispositionCode';
import { QcResultStatus } from '@modules/Inbound/Domain/Enums/QcResultStatus';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
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

export interface ConfirmInboundPlanDto {
  Id: string;
}

export interface CancelInboundPlanDto {
  Id: string;
}

export interface UpdateInboundPlanLineDto {
  LineNumber: number;
  SkuId: string;
  UomId: string;
  ExpectedQuantity: number;
  ExternalLineReference?: string | null;
}

export interface UpdateInboundPlanDto {
  Id: string;
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  SupplierId: string;
  OwnerId: string;
  WarehouseId: string;
  WarehouseProfileId?: string | null;
  ExpectedArrivalAt?: Date | string | null;
  // Re-review fix (P1 decision): optimistic concurrency token -- see UpdateInboundPlanUseCase.
  ExpectedUpdatedAt: Date | string;
  Lines: UpdateInboundPlanLineDto[];
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
  Decision: 'Allowed' | 'Blocked' | 'ApprovalRequired' | 'OverrideAccepted';
  GateInRequired: boolean;
  GateInRecorded: boolean;
  OverrideAccepted: boolean;
  Reason: string;
  RuleCode: string | null;
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
  InboundPlanId: string | null;
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
  InboundPlanId: string | null;
  ReceiptNumber: string;
  BusinessReference: string;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  WarehouseProfileId: string | null;
  SupplierId: string;
  SupplierCode: string | null;
  SupplierName: string | null;
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
  InboundPlanLineId?: string | null;
  ActualQuantity: number;
  ExpectedQuantity?: number | null;
  SkuId?: string | null;
  UomId?: string | null;
  ManualConfirm?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  LotNumber?: string | null;
  ExpiryDate?: string | null;
  SerialNumber?: string | null;
  IdempotencyKey: string;
  ScanEvidence?: ReceiptLineScanEvidenceDto | null;
}

export interface ReceiptLineDto {
  Id: string;
  ReceiptId: string;
  InboundPlanId: string | null;
  InboundPlanLineId: string | null;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ExpectedQuantity: number | null;
  ActualQuantity: number;
  Status: ReceiptLineStatus;
  ManualConfirm: boolean;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  ScanEvidenceJson: Record<string, unknown> | null;
  DiscrepancySignals: ReceiptLineDiscrepancySignal[];
  LotNumber: string | null;
  ExpiryDate: Date | null;
  SerialNumber: string | null;
  IdempotencyKey: string;
  ReceivedAt: Date;
  ReceivedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConfirmInboundLpnDto {
  ReceiptId: string;
  ReceiptLineId: string;
  LpnCode: string;
  SsccCode?: string | null;
  Quantity?: number | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface InboundLpnDto {
  Id: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string | null;
  InboundPlanLineId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  LpnCode: string;
  SsccCode: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  ConfirmedAt: Date;
  ConfirmedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ReleaseInboundToPutawayDto {
  ReceiptId: string;
  ReceiptLineId: string;
  CurrentLocationId?: string | null;
  CurrentLocationCode?: string | null;
  RequireLpn?: boolean;
  AttemptLabelOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface InboundPutawayReleaseDto {
  Id: string;
  InboundLpnId: string | null;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string | null;
  InboundPlanLineId: string | null;
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
  LotNumber: string | null;
  ExpiryDate: Date | null;
  SerialNumber: string | null;
  InventoryStatusCode: string;
  CurrentLocationId: string | null;
  CurrentLocationCode: string | null;
  WarehouseProfileId: string | null;
  LabelDecision: string | null;
  LabelReason: string | null;
  MatchedPrintJobId: string | null;
  ConstraintJson: Record<string, unknown> | null;
  RuleCode: string | null;
  OutboxMessageId: string | null;
  CoreFlowMilestoneId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  ReleasedAt: Date;
  ReleasedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CaptureInboundDiscrepancyDto {
  ReceiptId: string;
  ReceiptLineId: string;
  DiscrepancyType: InboundDiscrepancyType;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  EvidenceJson?: Record<string, unknown> | null;
  IdempotencyKey: string;
}

export interface ListInboundDiscrepanciesDto {
  Page?: number;
  PageSize?: number;
  ReceiptId?: string;
  ReceiptLineId?: string;
  InboundPlanId?: string;
  WarehouseId?: string;
  OwnerId?: string;
  Status?: InboundDiscrepancyStatus;
}

export interface InboundDiscrepancyDto {
  Id: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string | null;
  InboundPlanLineId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  DiscrepancyType: InboundDiscrepancyType;
  Signals: ReceiptLineDiscrepancySignal[];
  Status: InboundDiscrepancyStatus;
  Severity: ControlExceptionSeverity;
  ToleranceDecision: InboundDiscrepancyToleranceDecision;
  ExpectedQuantity: number | null;
  ActualQuantity: number;
  ReasonCode: string;
  ReasonCodeId: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  EvidenceJson: Record<string, unknown> | null;
  RuleCode: string | null;
  ExceptionCaseId: string;
  ExceptionState: ExceptionState;
  IdempotencyKey: string;
  RecordedAt: Date;
  RecordedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface EvaluateQcTaskDto {
  ReceiptId: string;
  ReceiptLineId: string;
  IdempotencyKey: string;
  ForceRequired?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface QcTaskDto {
  Id: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string | null;
  InboundPlanLineId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ActualQuantity: number;
  TaskStatus: QcTaskStatus;
  Required: boolean;
  TriggerReason: string;
  TriggerPolicyJson: Record<string, unknown> | null;
  SamplingPercent: number | null;
  InventoryStatusCode: string;
  TargetInventoryStatusCode: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  IsDuplicate: boolean;
  CreatedBy: string | null;
  UpdatedBy: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface RecordQcResultDto {
  QcTaskId: string;
  IdempotencyKey: string;
  ResultStatus: QcResultStatus;
  DispositionCode: QcDispositionCode;
  InspectedQuantity: number;
  AcceptedQuantity: number;
  RejectedQuantity: number;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  EvidenceJson?: Record<string, unknown> | null;
}

export interface QcResultDto {
  Id: string;
  QcTaskId: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string | null;
  InboundPlanLineId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  ResultStatus: QcResultStatus;
  DispositionCode: QcDispositionCode;
  TaskStatus: QcTaskStatus;
  InspectedQuantity: number;
  AcceptedQuantity: number;
  RejectedQuantity: number;
  AcceptedInventoryStatusCode: string | null;
  RejectedInventoryStatusCode: string | null;
  TargetInventoryStatusCode: string;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  EvidenceJson: Record<string, unknown> | null;
  IdempotencyKey: string;
  RecordedAt: Date;
  RecordedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}
