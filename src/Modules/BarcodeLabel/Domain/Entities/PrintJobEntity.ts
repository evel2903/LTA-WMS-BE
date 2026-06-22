import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';

export class PrintJobEntity {
  public readonly Id: string;
  public JobCode: string;
  public TemplateId: string;
  public TemplateVersionId: string;
  public BusinessObjectType: string;
  public BusinessObjectId: string;
  public BusinessObjectCode: string | null;
  public WarehouseId: string | null;
  public OwnerId: string | null;
  public PayloadJson: Record<string, unknown>;
  public PreviewContent: string | null;
  public Status: PrintJobStatus;
  public ValidationErrors: Record<string, unknown> | null;
  public ReprintCount: number;
  public RequestedBy: string | null;
  public RequestedAt: Date;
  public CompletedAt: Date | null;
  public CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    JobCode: string;
    TemplateId: string;
    TemplateVersionId: string;
    BusinessObjectType: string;
    BusinessObjectId: string;
    BusinessObjectCode?: string | null;
    WarehouseId?: string | null;
    OwnerId?: string | null;
    PayloadJson: Record<string, unknown>;
    PreviewContent?: string | null;
    Status?: PrintJobStatus;
    ValidationErrors?: Record<string, unknown> | null;
    ReprintCount?: number;
    RequestedBy?: string | null;
    RequestedAt: Date;
    CompletedAt?: Date | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.JobCode = params.JobCode;
    this.TemplateId = params.TemplateId;
    this.TemplateVersionId = params.TemplateVersionId;
    this.BusinessObjectType = params.BusinessObjectType;
    this.BusinessObjectId = params.BusinessObjectId;
    this.BusinessObjectCode = params.BusinessObjectCode ?? null;
    this.WarehouseId = params.WarehouseId ?? null;
    this.OwnerId = params.OwnerId ?? null;
    this.PayloadJson = params.PayloadJson;
    this.PreviewContent = params.PreviewContent ?? null;
    this.Status = params.Status ?? PrintJobStatus.Requested;
    this.ValidationErrors = params.ValidationErrors ?? null;
    this.ReprintCount = params.ReprintCount ?? 0;
    this.RequestedBy = params.RequestedBy ?? null;
    this.RequestedAt = params.RequestedAt;
    this.CompletedAt = params.CompletedAt ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
