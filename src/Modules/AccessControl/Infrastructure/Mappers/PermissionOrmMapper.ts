import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';

export class PermissionOrmMapper {
  public static ToDomain(entity: PermissionOrmEntity): PermissionEntity {
    return new PermissionEntity({
      Id: entity.Id,
      Action: entity.Action as ActionCode,
      ObjectType: entity.ObjectType as ObjectType,
      PermissionCode: entity.PermissionCode,
      Description: entity.Description,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: PermissionEntity): PermissionOrmEntity {
    const orm = new PermissionOrmEntity();
    orm.Id = entity.Id;
    orm.PermissionCode = entity.PermissionCode;
    orm.Action = entity.Action;
    orm.ObjectType = entity.ObjectType;
    orm.Description = entity.Description;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
