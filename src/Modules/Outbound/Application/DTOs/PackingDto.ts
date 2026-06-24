import { LabelBlockingValidationResultDto } from '@modules/BarcodeLabel/Application/DTOs/LabelBlockingValidationDto';
import { LabelBlockingDecision } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDecision';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { PackSessionStatus } from '@modules/Outbound/Domain/Enums/PackSessionStatus';

export interface PackSessionDto {
  Id: string;
  SessionNumber: string;
  PickTaskId: string;
  MobileTaskId: string | null;
  OutboundOrderId: string;
  WarehouseProfileId: string;
  WarehouseId: string | null;
  WarehouseCode: string | null;
  OwnerId: string | null;
  OwnerCode: string | null;
  Status: PackSessionStatus;
  CheckRequired: boolean;
  CheckResult: PackageCheckResult;
  CheckExceptionCaseId: string | null;
  StartedAt: string;
  StartedBy: string | null;
  CheckedAt: string | null;
  CheckedBy: string | null;
}

export interface PackageContentDto {
  Id: string;
  PackageId: string;
  PickTaskId: string;
  OutboundOrderLineId: string;
  SourceBalanceId: string;
  SourceDimensionId: string;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  InventoryStatusCode: string | null;
  LotNumber: string | null;
  SerialNumber: string | null;
  ExpiryDate: string | null;
  CreatedAt: string;
}

export interface PackageDto {
  Id: string;
  PackageCode: string;
  PackSessionId: string;
  PickTaskId: string;
  OutboundOrderId: string;
  WarehouseProfileId: string;
  WarehouseId: string | null;
  WarehouseCode: string | null;
  OwnerId: string | null;
  OwnerCode: string | null;
  Status: PackageStatus;
  CheckRequired: boolean;
  CheckResult: PackageCheckResult;
  CartonType: string;
  Weight: number | null;
  Length: number | null;
  Width: number | null;
  Height: number | null;
  LabelBlockingDecision: LabelBlockingDecision | null;
  LabelPrintJobId: string | null;
  LabelPrintJobCode: string | null;
  ClosedAt: string | null;
  ClosedBy: string | null;
  ReadyForStagingAt: string | null;
  ReadyForStagingBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  Contents: PackageContentDto[];
}

export interface ListPackagesDto {
  Page?: number;
  PageSize?: number;
  WarehouseId?: string;
  OwnerId?: string;
  Status?: PackageStatus;
  PickTaskId?: string;
  OutboundOrderId?: string;
}

export interface StartPackSessionDto {
  PickTaskId: string;
  MobileTaskId?: string | null;
  WarehouseProfileId: string;
  CheckRequired?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  IdempotencyKey: string;
}

export interface RecordPackCheckDto {
  CheckResult: PackageCheckResult;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  ObservedQuantity?: number | null;
  ObservedSkuId?: string | null;
  ObservedSkuCode?: string | null;
  Weight?: number | null;
  IdempotencyKey: string;
}

export interface CreatePackageContentDto {
  PickTaskId?: string | null;
  Quantity?: number | null;
}

export interface CreatePackageDto {
  PackSessionId: string;
  CartonType: string;
  Weight?: number | null;
  Length?: number | null;
  Width?: number | null;
  Height?: number | null;
  Contents?: CreatePackageContentDto[] | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  IdempotencyKey: string;
}

export interface ClosePackageDto {
  CartonType?: string | null;
  Weight?: number | null;
  Length?: number | null;
  Width?: number | null;
  Height?: number | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  IdempotencyKey: string;
}

export interface ReadyForStagingDto {
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  LabelType?: string | null;
  IdempotencyKey: string;
}

export interface ReadyForStagingResultDto {
  Package: PackageDto;
  LabelValidation: LabelBlockingValidationResultDto;
  IsDuplicate: boolean;
}
