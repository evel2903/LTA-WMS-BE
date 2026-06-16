import { NotFoundException } from '../../../../Common/Exceptions/AppException';
import { IUserRepository } from '../../Domain/Interfaces/IUserRepository';
import { UserDto } from '../DTOs/UserDto';
import { UserDtoMapper } from '../Mappers/UserDtoMapper';

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
