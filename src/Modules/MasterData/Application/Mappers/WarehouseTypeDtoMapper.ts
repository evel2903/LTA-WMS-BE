import { WarehouseTypeDto } from '@modules/MasterData/Application/DTOs/WarehouseTypeDto';
import { WarehouseTypeEntity } from '@modules/MasterData/Domain/Entities/WarehouseTypeEntity';

export class WarehouseTypeDtoMapper {
  public static ToDto(entity: WarehouseTypeEntity): WarehouseTypeDto {
    return {
      Id: entity.Id,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      WarehouseTypeName: entity.WarehouseTypeName,
      Description: entity.Description,
      Status: entity.Status,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
