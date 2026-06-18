import { WarehouseProfileAssignmentEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignmentEntity';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';

export class WarehouseProfileAssignmentOrmMapper {
  public static ToDomain(entity: WarehouseProfileAssignmentOrmEntity): WarehouseProfileAssignmentEntity {
    return new WarehouseProfileAssignmentEntity({
      Id: entity.Id,
      WarehouseProfileId: entity.WarehouseProfileId,
      AssignmentType: entity.AssignmentType as AssignmentType,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      WarehouseId: entity.WarehouseId,
      ScopeKey: entity.ScopeKey,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: WarehouseProfileAssignmentEntity): WarehouseProfileAssignmentOrmEntity {
    const orm = new WarehouseProfileAssignmentOrmEntity();
    orm.Id = entity.Id;
    orm.WarehouseProfileId = entity.WarehouseProfileId;
    orm.AssignmentType = entity.AssignmentType;
    orm.WarehouseTypeCode = entity.WarehouseTypeCode;
    orm.WarehouseId = entity.WarehouseId;
    orm.ScopeKey = entity.ScopeKey;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
