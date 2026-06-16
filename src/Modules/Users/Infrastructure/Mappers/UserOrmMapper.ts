import { EmailAddress } from '../../Domain/ValueObjects/EmailAddress';
import { UserEntity } from '../../Domain/Entities/UserEntity';
import { UserOrmEntity } from '../Persistence/Entities/UserOrmEntity';
import { Role } from '../../../../Common/Constants/Role';

export class UserOrmMapper {
  public static ToDomain(entity: UserOrmEntity): UserEntity {
    return new UserEntity({
      Id: entity.Id,
      FirstName: entity.FirstName,
      LastName: entity.LastName,
      EmailAddress: EmailAddress.Create(entity.EmailAddress),
      PasswordHash: entity.PasswordHash,
      Role: (entity.Role as Role) ?? Role.User,
      CreatedAt: entity.CreatedAt,
    });
  }

  public static ToOrm(entity: UserEntity): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.Id = entity.Id;
    orm.FirstName = entity.FirstName;
    orm.LastName = entity.LastName;
    orm.EmailAddress = entity.EmailAddress.Value;
    orm.PasswordHash = entity.PasswordHash;
    orm.Role = entity.Role;
    orm.CreatedAt = entity.CreatedAt;
    return orm;
  }
}
