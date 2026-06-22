import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';
import { ReprintRequestStatus } from '@modules/BarcodeLabel/Domain/Enums/ReprintRequestStatus';

export interface PrintJobDto {
  Id: string;
  JobCode: string;
  TemplateId: string;
  TemplateVersionId: string;
  BusinessObjectType: string;
  BusinessObjectId: string;
  BusinessObjectCode: string | null;
  WarehouseId: string | null;
  OwnerId: string | null;
  PayloadJson: Record<string, unknown>;
  PreviewContent: string | null;
  Status: PrintJobStatus;
  ValidationErrors: Record<string, unknown> | null;
  ReprintCount: number;
  RequestedBy: string | null;
  RequestedAt: string;
  CompletedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface ReprintRequestDto {
  Id: string;
  OriginalPrintJobId: string;
  ReprintSequence: number;
  ReasonCode: string;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[] | null;
  Status: ReprintRequestStatus;
  RequestedBy: string | null;
  RequestedAt: string;
}
