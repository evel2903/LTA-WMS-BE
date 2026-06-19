import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';

export class RolePermissionOrmMapper {
  public static ToDomain(entity: RolePermissionOrmEntity): RolePermissionEntity {
    return new RolePermissionEntity({
      Id: entity.Id,
      RoleId: entity.RoleId,
      PermissionId: entity.PermissionId,
      CreatedAt: entity.CreatedAt,
      CreatedBy: entity.CreatedBy,
    });
  }

  public static ToOrm(entity: RolePermissionEntity): RolePermissionOrmEntity {
    const orm = new RolePermissionOrmEntity();
    orm.Id = entity.Id;
    orm.RoleId = entity.RoleId;
    orm.PermissionId = entity.PermissionId;
    orm.CreatedAt = entity.CreatedAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }
}
