import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export interface LabelTemplateDto {
  Id: string;
  TemplateCode: string;
  TemplateName: string;
  LabelType: string;
  Status: LabelTemplateStatus;
  RequiredFields: string[];
  TemplateBody: string;
  ActiveVersionId: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface LabelTemplateVersionDto {
  Id: string;
  TemplateId: string;
  VersionNo: number;
  TemplateBody: string;
  RequiredFields: string[];
  Status: LabelTemplateStatus;
  CreatedAt: string;
  CreatedBy: string | null;
}
