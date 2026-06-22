import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuBarcodeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuBarcodeOrmEntity';

export class SkuBarcodeOrmMapper {
  public static ToDomain(entity: SkuBarcodeOrmEntity): SkuBarcodeEntity {
    return new SkuBarcodeEntity({
      Id: entity.Id,
      SkuId: entity.SkuId,
      OwnerId: entity.OwnerId,
      UomId: entity.UomId,
      PackCode: entity.PackCode,
      BarcodeValue: entity.BarcodeValue,
      BarcodeType: entity.BarcodeType,
      IsPrimary: entity.IsPrimary,
      Status: entity.Status as MasterDataStatus,
      EffectiveFrom: entity.EffectiveFrom,
      EffectiveTo: entity.EffectiveTo,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: SkuBarcodeEntity): SkuBarcodeOrmEntity {
    const orm = new SkuBarcodeOrmEntity();
    orm.Id = entity.Id;
    orm.SkuId = entity.SkuId;
    orm.OwnerId = entity.OwnerId;
    orm.UomId = entity.UomId;
    orm.PackCode = entity.PackCode;
    orm.BarcodeValue = entity.BarcodeValue;
    orm.BarcodeType = entity.BarcodeType;
    orm.IsPrimary = entity.IsPrimary;
    orm.Status = entity.Status;
    orm.EffectiveFrom = entity.EffectiveFrom;
    orm.EffectiveTo = entity.EffectiveTo;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
