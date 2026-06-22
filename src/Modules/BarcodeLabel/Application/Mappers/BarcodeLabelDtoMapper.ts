import { LabelTemplateDto, LabelTemplateVersionDto } from '@modules/BarcodeLabel/Application/DTOs/LabelTemplateDto';
import { PrintJobDto, ReprintRequestDto } from '@modules/BarcodeLabel/Application/DTOs/PrintJobDto';
import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';

export class BarcodeLabelDtoMapper {
  public static ToTemplateDto(entity: LabelTemplateEntity): LabelTemplateDto {
    return {
      Id: entity.Id,
      TemplateCode: entity.TemplateCode,
      TemplateName: entity.TemplateName,
      LabelType: entity.LabelType,
      Status: entity.Status,
      RequiredFields: entity.RequiredFields,
      TemplateBody: entity.TemplateBody,
      ActiveVersionId: entity.ActiveVersionId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }

  public static ToVersionDto(entity: LabelTemplateVersionEntity): LabelTemplateVersionDto {
    return {
      Id: entity.Id,
      TemplateId: entity.TemplateId,
      VersionNo: entity.VersionNo,
      TemplateBody: entity.TemplateBody,
      RequiredFields: entity.RequiredFields,
      Status: entity.Status,
      CreatedAt: entity.CreatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
    };
  }

  public static ToPrintJobDto(entity: PrintJobEntity): PrintJobDto {
    return {
      Id: entity.Id,
      JobCode: entity.JobCode,
      TemplateId: entity.TemplateId,
      TemplateVersionId: entity.TemplateVersionId,
      BusinessObjectType: entity.BusinessObjectType,
      BusinessObjectId: entity.BusinessObjectId,
      BusinessObjectCode: entity.BusinessObjectCode,
      WarehouseId: entity.WarehouseId,
      OwnerId: entity.OwnerId,
      PayloadJson: entity.PayloadJson,
      PreviewContent: entity.PreviewContent,
      Status: entity.Status,
      ValidationErrors: entity.ValidationErrors,
      ReprintCount: entity.ReprintCount,
      RequestedBy: entity.RequestedBy,
      RequestedAt: entity.RequestedAt.toISOString(),
      CompletedAt: entity.CompletedAt?.toISOString() ?? null,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }

  public static ToReprintDto(entity: ReprintRequestEntity): ReprintRequestDto {
    return {
      Id: entity.Id,
      OriginalPrintJobId: entity.OriginalPrintJobId,
      ReprintSequence: entity.ReprintSequence,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      Status: entity.Status,
      RequestedBy: entity.RequestedBy,
      RequestedAt: entity.RequestedAt.toISOString(),
    };
  }
}
