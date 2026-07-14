import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';

export class RoleOrmMapper {
  public static ToDomain(entity: RoleOrmEntity): RoleEntity {
    return new RoleEntity({
      Id: entity.Id,
      RoleCode: entity.RoleCode,
      RoleName: entity.RoleName,
      Description: entity.Description,
      IsSystem: entity.IsSystem,
      Status: entity.Status as RoleStatus,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: RoleEntity): RoleOrmEntity {
    const orm = new RoleOrmEntity();
    orm.Id = entity.Id;
    orm.RoleCode = entity.RoleCode;
    orm.RoleName = entity.RoleName;
    orm.Description = entity.Description;
    orm.IsSystem = entity.IsSystem;
    orm.Status = entity.Status;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
