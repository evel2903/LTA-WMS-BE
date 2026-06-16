import { UserEntity } from '../../Domain/Entities/UserEntity';
import { UserDto } from '../DTOs/UserDto';

export class UserDtoMapper {
  public static ToDto(user: UserEntity): UserDto {
    return {
      Id: user.Id,
      FirstName: user.FirstName,
      LastName: user.LastName,
      EmailAddress: user.EmailAddress.Value,
      CreatedAt: user.CreatedAt.toISOString(),
    };
  }
}
