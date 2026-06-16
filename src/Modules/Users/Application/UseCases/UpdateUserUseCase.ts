import { ConflictException, NotFoundException } from '../../../../Common/Exceptions/AppException';
import { EmailAddress } from '../../Domain/ValueObjects/EmailAddress';
import { IUserRepository } from '../../Domain/Interfaces/IUserRepository';
import { UpdateUserDto } from '../DTOs/UpdateUserDto';
import { UserDto } from '../DTOs/UserDto';
import { UserDtoMapper } from '../Mappers/UserDtoMapper';

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async Execute(request: UpdateUserDto): Promise<UserDto> {
    const user = await this.userRepository.FindById(request.Id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (request.EmailAddress) {
      const email = EmailAddress.Create(request.EmailAddress);
      const existing = await this.userRepository.FindByEmail(email.Value);
      if (existing && existing.Id !== user.Id) {
        throw new ConflictException('Email already exists');
      }
      user.EmailAddress = email;
    }

    if (request.FirstName !== undefined) user.FirstName = request.FirstName;
    if (request.LastName !== undefined) user.LastName = request.LastName;

    await this.userRepository.Update(user);
    const updated = await this.userRepository.FindById(user.Id);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return UserDtoMapper.ToDto(updated);
  }
}
