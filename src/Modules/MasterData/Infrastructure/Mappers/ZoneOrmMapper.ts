import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';

export class ZoneOrmMapper {
  public static ToDomain(entity: ZoneOrmEntity): ZoneEntity {
    return new ZoneEntity({
      Id: entity.Id,
      WarehouseId: entity.WarehouseId,
      ZoneCode: entity.ZoneCode,
      ZoneName: entity.ZoneName,
      ZoneType: entity.ZoneType,
      Status: entity.Status as MasterDataStatus,
      Sequence: entity.Sequence,
      TemperatureClass: entity.TemperatureClass,
      ComplianceFlags: entity.ComplianceFlags,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ZoneEntity): ZoneOrmEntity {
    const orm = new ZoneOrmEntity();
    orm.Id = entity.Id;
    orm.WarehouseId = entity.WarehouseId;
    orm.ZoneCode = entity.ZoneCode;
    orm.ZoneName = entity.ZoneName;
    orm.ZoneType = entity.ZoneType;
    orm.Status = entity.Status;
    orm.Sequence = entity.Sequence;
    orm.TemperatureClass = entity.TemperatureClass;
    orm.ComplianceFlags = entity.ComplianceFlags;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
