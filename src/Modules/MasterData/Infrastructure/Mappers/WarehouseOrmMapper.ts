import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';

export class WarehouseOrmMapper {
  public static ToDomain(entity: WarehouseOrmEntity): WarehouseEntity {
    return new WarehouseEntity({
      Id: entity.Id,
      SiteId: entity.SiteId,
      WarehouseCode: entity.WarehouseCode,
      WarehouseName: entity.WarehouseName,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      Status: entity.Status as MasterDataStatus,
      Timezone: entity.Timezone,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: WarehouseEntity): WarehouseOrmEntity {
    const orm = new WarehouseOrmEntity();
    orm.Id = entity.Id;
    orm.SiteId = entity.SiteId;
    orm.WarehouseCode = entity.WarehouseCode;
    orm.WarehouseName = entity.WarehouseName;
    orm.WarehouseTypeCode = entity.WarehouseTypeCode;
    orm.Status = entity.Status;
    orm.Timezone = entity.Timezone;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
