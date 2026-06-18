import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { PackDefinitionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/PackDefinitionOrmEntity';

export class PackDefinitionOrmMapper {
  public static ToDomain(entity: PackDefinitionOrmEntity): PackDefinitionEntity {
    return new PackDefinitionEntity({
      Id: entity.Id,
      SkuId: entity.SkuId,
      PackCode: entity.PackCode,
      PackName: entity.PackName,
      UomId: entity.UomId,
      QuantityPerPack: Number(entity.QuantityPerPack),
      IsDefault: entity.IsDefault,
      Status: entity.Status as MasterDataStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: PackDefinitionEntity): PackDefinitionOrmEntity {
    const orm = new PackDefinitionOrmEntity();
    orm.Id = entity.Id;
    orm.SkuId = entity.SkuId;
    orm.PackCode = entity.PackCode;
    orm.PackName = entity.PackName;
    orm.UomId = entity.UomId;
    orm.QuantityPerPack = entity.QuantityPerPack;
    orm.IsDefault = entity.IsDefault;
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
