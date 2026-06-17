import { WarehouseDto } from '@modules/MasterData/Application/DTOs/WarehouseDto';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';

export class WarehouseDtoMapper {
  public static ToDto(entity: WarehouseEntity): WarehouseDto {
    return {
      Id: entity.Id,
      SiteId: entity.SiteId,
      WarehouseCode: entity.WarehouseCode,
      WarehouseName: entity.WarehouseName,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      Status: entity.Status,
      Timezone: entity.Timezone,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
