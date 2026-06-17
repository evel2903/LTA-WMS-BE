import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';

export class UomOrmMapper {
  public static ToDomain(entity: UomOrmEntity): UomEntity {
    return new UomEntity({
      Id: entity.Id,
      UomCode: entity.UomCode,
      UomName: entity.UomName,
      UomType: entity.UomType,
      DecimalPrecision: entity.DecimalPrecision,
      Status: entity.Status as MasterDataStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: UomEntity): UomOrmEntity {
    const orm = new UomOrmEntity();
    orm.Id = entity.Id;
    orm.UomCode = entity.UomCode;
    orm.UomName = entity.UomName;
    orm.UomType = entity.UomType;
    orm.DecimalPrecision = entity.DecimalPrecision;
    orm.Status = entity.Status;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
