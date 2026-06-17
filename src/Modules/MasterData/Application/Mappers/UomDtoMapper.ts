import { UomDto } from '@modules/MasterData/Application/DTOs/UomDto';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';

export class UomDtoMapper {
  public static ToDto(uom: UomEntity): UomDto {
    return {
      Id: uom.Id,
      UomCode: uom.UomCode,
      UomName: uom.UomName,
      UomType: uom.UomType,
      DecimalPrecision: uom.DecimalPrecision,
      Status: uom.Status,
      SourceSystem: uom.SourceSystem,
      ReferenceId: uom.ReferenceId,
      CreatedAt: uom.CreatedAt,
      UpdatedAt: uom.UpdatedAt,
      CreatedBy: uom.CreatedBy,
      UpdatedBy: uom.UpdatedBy,
    };
  }
}
