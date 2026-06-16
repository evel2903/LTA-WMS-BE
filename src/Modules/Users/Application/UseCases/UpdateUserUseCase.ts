import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { EmailAddress } from '@modules/Users/Domain/ValueObjects/EmailAddress';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { UpdateUserDto } from '@modules/Users/Application/DTOs/UpdateUserDto';
import { UserDto } from '@modules/Users/Application/DTOs/UserDto';
import { UserDtoMapper } from '@modules/Users/Application/Mappers/UserDtoMapper';

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
