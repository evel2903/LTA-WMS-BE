import { SkuBarcodeDto } from '@modules/MasterData/Application/DTOs/SkuBarcodeDto';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';

export class SkuBarcodeMapper {
  public static ToDto(entity: SkuBarcodeEntity): SkuBarcodeDto {
    return {
      Id: entity.Id,
      SkuId: entity.SkuId,
      OwnerId: entity.OwnerId,
      UomId: entity.UomId,
      PackCode: entity.PackCode,
      BarcodeValue: entity.BarcodeValue,
      BarcodeType: entity.BarcodeType,
      IsPrimary: entity.IsPrimary,
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
