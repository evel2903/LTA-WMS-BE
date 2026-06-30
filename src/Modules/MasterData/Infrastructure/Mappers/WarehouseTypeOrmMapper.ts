import { WarehouseTypeEntity } from '@modules/MasterData/Domain/Entities/WarehouseTypeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { WarehouseTypeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseTypeOrmEntity';

export class WarehouseTypeOrmMapper {
  public static ToDomain(entity: WarehouseTypeOrmEntity): WarehouseTypeEntity {
    return new WarehouseTypeEntity({
      Id: entity.Id,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      WarehouseTypeName: entity.WarehouseTypeName,
      Description: entity.Description,
      Status: entity.Status as MasterDataStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: WarehouseTypeEntity): WarehouseTypeOrmEntity {
    const orm = new WarehouseTypeOrmEntity();
    orm.Id = entity.Id;
    orm.WarehouseTypeCode = entity.WarehouseTypeCode;
    orm.WarehouseTypeName = entity.WarehouseTypeName;
    orm.Description = entity.Description;
    orm.Status = entity.Status;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
