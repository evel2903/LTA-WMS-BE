import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export class LabelTemplateEntity {
  public readonly Id: string;
  public TemplateCode: string;
  public TemplateName: string;
  public LabelType: string;
  public Status: LabelTemplateStatus;
  public RequiredFields: string[];
  public TemplateBody: string;
  public ActiveVersionId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    TemplateCode: string;
    TemplateName: string;
    LabelType: string;
    Status?: LabelTemplateStatus;
    RequiredFields: string[];
    TemplateBody: string;
    ActiveVersionId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.TemplateCode = params.TemplateCode;
    this.TemplateName = params.TemplateName;
    this.LabelType = params.LabelType;
    this.Status = params.Status ?? LabelTemplateStatus.Active;
    this.RequiredFields = params.RequiredFields;
    this.TemplateBody = params.TemplateBody;
    this.ActiveVersionId = params.ActiveVersionId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
