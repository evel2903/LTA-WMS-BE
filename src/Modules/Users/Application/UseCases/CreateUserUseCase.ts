import { randomUUID } from 'crypto';
import { ConflictException } from '../../../../Common/Exceptions/AppException';
import { EmailAddress } from '../../Domain/ValueObjects/EmailAddress';
import { UserEntity } from '../../Domain/Entities/UserEntity';
import { IUserRepository } from '../../Domain/Interfaces/IUserRepository';
import { CreateUserDto } from '../DTOs/CreateUserDto';
import { UserDto } from '../DTOs/UserDto';
import { UserDtoMapper } from '../Mappers/UserDtoMapper';

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
