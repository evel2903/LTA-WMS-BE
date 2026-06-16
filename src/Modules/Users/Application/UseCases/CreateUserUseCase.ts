import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { EmailAddress } from '@modules/Users/Domain/ValueObjects/EmailAddress';
import { UserEntity } from '@modules/Users/Domain/Entities/UserEntity';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { CreateUserDto } from '@modules/Users/Application/DTOs/CreateUserDto';
import { UserDto } from '@modules/Users/Application/DTOs/UserDto';
import { UserDtoMapper } from '@modules/Users/Application/Mappers/UserDtoMapper';

export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async Execute(request: CreateUserDto): Promise<UserDto> {
    const email = EmailAddress.Create(request.EmailAddress);
    const existing = await this.userRepository.FindByEmail(email.Value);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = new UserEntity({
      Id: randomUUID(),
      FirstName: request.FirstName,
      LastName: request.LastName,
      EmailAddress: email,
      CreatedAt: new Date(),
    });

    const created = await this.userRepository.Create(user);
    return UserDtoMapper.ToDto(created);
  }
}
