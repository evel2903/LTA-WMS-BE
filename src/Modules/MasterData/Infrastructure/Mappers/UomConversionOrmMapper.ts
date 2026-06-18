import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { UomConversionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomConversionOrmEntity';

export class UomConversionOrmMapper {
  public static ToDomain(entity: UomConversionOrmEntity): UomConversionEntity {
    return new UomConversionEntity({
      Id: entity.Id,
      SkuId: entity.SkuId,
      FromUomId: entity.FromUomId,
      ToUomId: entity.ToUomId,
      Factor: Number(entity.Factor),
      EffectiveFrom: entity.EffectiveFrom,
      EffectiveTo: entity.EffectiveTo,
      Status: entity.Status as MasterDataStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: UomConversionEntity): UomConversionOrmEntity {
    const orm = new UomConversionOrmEntity();
    orm.Id = entity.Id;
    orm.SkuId = entity.SkuId;
    orm.FromUomId = entity.FromUomId;
    orm.ToUomId = entity.ToUomId;
    orm.Factor = entity.Factor;
    orm.EffectiveFrom = entity.EffectiveFrom;
    orm.EffectiveTo = entity.EffectiveTo;
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
