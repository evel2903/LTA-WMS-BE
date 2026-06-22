import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { PartnerOrmEntity } from '@modules/PartnerMaster/Infrastructure/Persistence/Entities/PartnerOrmEntity';

export class PartnerOrmMapper {
  public static ToDomain(entity: PartnerOrmEntity): PartnerEntity {
    return new PartnerEntity({
      Id: entity.Id,
      PartnerCode: entity.PartnerCode,
      PartnerName: entity.PartnerName,
      PartnerType: entity.PartnerType as PartnerType,
      Status: entity.Status as PartnerStatus,
      SourceSystem: entity.SourceSystem,
      ExternalReference: entity.ExternalReference,
      ReferenceText: entity.ReferenceText,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: PartnerEntity): PartnerOrmEntity {
    const orm = new PartnerOrmEntity();
    orm.Id = entity.Id;
    orm.PartnerCode = entity.PartnerCode;
    orm.PartnerName = entity.PartnerName;
    orm.PartnerType = entity.PartnerType;
    orm.Status = entity.Status;
    orm.SourceSystem = entity.SourceSystem;
    orm.ExternalReference = entity.ExternalReference;
    orm.ReferenceText = entity.ReferenceText;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
