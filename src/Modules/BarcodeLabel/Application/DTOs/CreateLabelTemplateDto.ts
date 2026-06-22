import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export interface CreateLabelTemplateDto {
  TemplateCode: string;
  TemplateName: string;
  LabelType: string;
  RequiredFields: string[];
  TemplateBody: string;
  Status?: LabelTemplateStatus;
}

export interface CreateLabelTemplateVersionDto {
  TemplateId: string;
  RequiredFields: string[];
  TemplateBody: string;
}
