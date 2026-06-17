import { ZoneDto } from '@modules/MasterData/Application/DTOs/ZoneDto';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';

export class ZoneDtoMapper {
  public static ToDto(entity: ZoneEntity): ZoneDto {
    return {
      Id: entity.Id,
      WarehouseId: entity.WarehouseId,
      ZoneCode: entity.ZoneCode,
      ZoneName: entity.ZoneName,
      ZoneType: entity.ZoneType,
      Status: entity.Status,
      Sequence: entity.Sequence,
      TemperatureClass: entity.TemperatureClass,
      ComplianceFlags: entity.ComplianceFlags,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
