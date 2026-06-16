import { NotFoundException } from '@common/Exceptions/AppException';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { UserDto } from '@modules/Users/Application/DTOs/UserDto';
import { UserDtoMapper } from '@modules/Users/Application/Mappers/UserDtoMapper';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async Execute(id: string): Promise<UserDto> {
    const user = await this.userRepository.FindById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return UserDtoMapper.ToDto(user);
  }
}
