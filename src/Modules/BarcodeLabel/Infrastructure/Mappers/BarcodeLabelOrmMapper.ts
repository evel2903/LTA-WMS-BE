import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';
import { LabelTemplateOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateOrmEntity';
import { LabelTemplateVersionOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateVersionOrmEntity';
import { PrintJobOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/PrintJobOrmEntity';
import { ReprintRequestOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/ReprintRequestOrmEntity';

export class BarcodeLabelOrmMapper {
  public static ToTemplateDomain(entity: LabelTemplateOrmEntity): LabelTemplateEntity {
    return new LabelTemplateEntity({
      Id: entity.Id,
      TemplateCode: entity.TemplateCode,
      TemplateName: entity.TemplateName,
      LabelType: entity.LabelType,
      Status: entity.Status,
      RequiredFields: entity.RequiredFields,
      TemplateBody: entity.TemplateBody,
      ActiveVersionId: entity.ActiveVersionId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToTemplateOrm(entity: LabelTemplateEntity): LabelTemplateOrmEntity {
    const orm = new LabelTemplateOrmEntity();
    orm.Id = entity.Id;
    orm.TemplateCode = entity.TemplateCode;
    orm.TemplateName = entity.TemplateName;
    orm.LabelType = entity.LabelType;
    orm.Status = entity.Status;
    orm.RequiredFields = entity.RequiredFields;
    orm.TemplateBody = entity.TemplateBody;
    orm.ActiveVersionId = entity.ActiveVersionId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }

  public static ToVersionDomain(entity: LabelTemplateVersionOrmEntity): LabelTemplateVersionEntity {
    return new LabelTemplateVersionEntity({
      Id: entity.Id,
      TemplateId: entity.TemplateId,
      VersionNo: entity.VersionNo,
      TemplateBody: entity.TemplateBody,
      RequiredFields: entity.RequiredFields,
      Status: entity.Status,
      CreatedAt: entity.CreatedAt,
      CreatedBy: entity.CreatedBy,
    });
  }

  public static ToVersionOrm(entity: LabelTemplateVersionEntity): LabelTemplateVersionOrmEntity {
    const orm = new LabelTemplateVersionOrmEntity();
    orm.Id = entity.Id;
    orm.TemplateId = entity.TemplateId;
    orm.VersionNo = entity.VersionNo;
    orm.TemplateBody = entity.TemplateBody;
    orm.RequiredFields = entity.RequiredFields;
    orm.Status = entity.Status;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }

  public static ToPrintJobDomain(entity: PrintJobOrmEntity): PrintJobEntity {
    return new PrintJobEntity({
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
      RequestedAt: entity.RequestedAt,
      CompletedAt: entity.CompletedAt,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToPrintJobOrm(entity: PrintJobEntity): PrintJobOrmEntity {
    const orm = new PrintJobOrmEntity();
    orm.Id = entity.Id;
    orm.JobCode = entity.JobCode;
    orm.TemplateId = entity.TemplateId;
    orm.TemplateVersionId = entity.TemplateVersionId;
    orm.BusinessObjectType = entity.BusinessObjectType;
    orm.BusinessObjectId = entity.BusinessObjectId;
    orm.BusinessObjectCode = entity.BusinessObjectCode;
    orm.WarehouseId = entity.WarehouseId;
    orm.OwnerId = entity.OwnerId;
    orm.PayloadJson = entity.PayloadJson;
    orm.PreviewContent = entity.PreviewContent;
    orm.Status = entity.Status;
    orm.ValidationErrors = entity.ValidationErrors;
    orm.ReprintCount = entity.ReprintCount;
    orm.RequestedBy = entity.RequestedBy;
    orm.RequestedAt = entity.RequestedAt;
    orm.CompletedAt = entity.CompletedAt;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }

  public static ToReprintDomain(entity: ReprintRequestOrmEntity): ReprintRequestEntity {
    return new ReprintRequestEntity({
      Id: entity.Id,
      OriginalPrintJobId: entity.OriginalPrintJobId,
      ReprintSequence: entity.ReprintSequence,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs,
      Status: entity.Status,
      RequestedBy: entity.RequestedBy,
      RequestedAt: entity.RequestedAt,
    });
  }

  public static ToReprintOrm(entity: ReprintRequestEntity): ReprintRequestOrmEntity {
    const orm = new ReprintRequestOrmEntity();
    orm.Id = entity.Id;
    orm.OriginalPrintJobId = entity.OriginalPrintJobId;
    orm.ReprintSequence = entity.ReprintSequence;
    orm.ReasonCode = entity.ReasonCode;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.ReasonNote = entity.ReasonNote;
    orm.EvidenceRefs = entity.EvidenceRefs;
    orm.Status = entity.Status;
    orm.RequestedBy = entity.RequestedBy;
    orm.RequestedAt = entity.RequestedAt;
    return orm;
  }
}
