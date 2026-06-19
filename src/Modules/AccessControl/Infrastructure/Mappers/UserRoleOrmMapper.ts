import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';

export class UserRoleOrmMapper {
  public static ToDomain(entity: UserRoleOrmEntity): UserRoleEntity {
    return new UserRoleEntity({
      Id: entity.Id,
      UserId: entity.UserId,
      RoleId: entity.RoleId,
      Source: entity.Source as UserRoleSource,
      AssignedAt: entity.AssignedAt,
      AssignedBy: entity.AssignedBy,
    });
  }

  public static ToOrm(entity: UserRoleEntity): UserRoleOrmEntity {
    const orm = new UserRoleOrmEntity();
    orm.Id = entity.Id;
    orm.UserId = entity.UserId;
    orm.RoleId = entity.RoleId;
    orm.Source = entity.Source;
    orm.AssignedAt = entity.AssignedAt;
    orm.AssignedBy = entity.AssignedBy;
    return orm;
  }
}
