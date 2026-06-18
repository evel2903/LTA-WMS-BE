import { PackDefinitionDto } from '@modules/MasterData/Application/DTOs/PackDefinitionDto';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';

export class PackDefinitionMapper {
  public static ToDto(entity: PackDefinitionEntity): PackDefinitionDto {
    return {
      Id: entity.Id,
      SkuId: entity.SkuId,
      PackCode: entity.PackCode,
      PackName: entity.PackName,
      UomId: entity.UomId,
      QuantityPerPack: entity.QuantityPerPack,
      IsDefault: entity.IsDefault,
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
