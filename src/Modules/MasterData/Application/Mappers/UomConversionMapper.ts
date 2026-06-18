import { UomConversionDto } from '@modules/MasterData/Application/DTOs/UomConversionDto';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';

export class UomConversionMapper {
  public static ToDto(entity: UomConversionEntity): UomConversionDto {
    return {
      Id: entity.Id,
      SkuId: entity.SkuId,
      FromUomId: entity.FromUomId,
      ToUomId: entity.ToUomId,
      Factor: entity.Factor,
      EffectiveFrom: entity.EffectiveFrom,
      EffectiveTo: entity.EffectiveTo,
      Status: entity.Status,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
