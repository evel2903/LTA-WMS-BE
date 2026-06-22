import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export class LabelTemplateVersionEntity {
  public readonly Id: string;
  public readonly TemplateId: string;
  public VersionNo: number;
  public TemplateBody: string;
  public RequiredFields: string[];
  public Status: LabelTemplateStatus;
  public readonly CreatedAt: Date;
  public readonly CreatedBy: string | null;

  constructor(params: {
    Id: string;
    TemplateId: string;
    VersionNo: number;
    TemplateBody: string;
    RequiredFields: string[];
    Status?: LabelTemplateStatus;
    CreatedAt: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.TemplateId = params.TemplateId;
    this.VersionNo = params.VersionNo;
    this.TemplateBody = params.TemplateBody;
    this.RequiredFields = params.RequiredFields;
    this.Status = params.Status ?? LabelTemplateStatus.Active;
    this.CreatedAt = params.CreatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
