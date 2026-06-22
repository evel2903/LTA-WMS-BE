export interface PreviewPrintJobDto {
  TemplateId: string;
  TemplateVersionId?: string | null;
  BusinessObjectType: string;
  BusinessObjectId: string;
  BusinessObjectCode?: string | null;
  WarehouseId?: string | null;
  OwnerId?: string | null;
  PayloadJson: Record<string, unknown>;
}

export interface ReprintPrintJobDto {
  PrintJobId: string;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
}
