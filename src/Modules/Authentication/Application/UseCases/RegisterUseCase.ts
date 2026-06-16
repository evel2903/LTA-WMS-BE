import { randomUUID } from 'crypto';
import { Role } from '../../../../Common/Constants/Role';
import { ConflictException } from '../../../../Common/Exceptions/AppException';
import { EmailAddress } from '../../../Users/Domain/ValueObjects/EmailAddress';
import { UserEntity } from '../../../Users/Domain/Entities/UserEntity';
import { IUserRepository } from '../../../Users/Domain/Interfaces/IUserRepository';
import { IPasswordHasher } from '../../Domain/Interfaces/IPasswordHasher';
import { ITokenService } from '../../Domain/Interfaces/ITokenService';
import { RegisterDto } from '../DTOs/RegisterDto';
import { AuthResultDto } from '../DTOs/AuthResultDto';

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  public async Execute(request: RegisterDto): Promise<AuthResultDto> {
    const email = EmailAddress.Create(request.EmailAddress);
    const existing = await this.userRepository.FindByEmail(email.Value);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await this.passwordHasher.Hash(request.Password);

    const user = new UserEntity({
      Id: randomUUID(),
      FirstName: request.FirstName,
      LastName: request.LastName,
      EmailAddress: email,
      PasswordHash: passwordHash,
      Role: Role.User,
      CreatedAt: new Date(),
    });

    const created = await this.userRepository.Create(user);
    const token = await this.tokenService.SignAccessToken({
      Sub: created.Id,
      EmailAddress: created.EmailAddress.Value,
      Role: created.Role,
    });

    return {
      AccessToken: token.AccessToken,
      ExpiresIn: token.ExpiresIn,
      User: { Id: created.Id, EmailAddress: created.EmailAddress.Value, Role: created.Role },
    };
  }
}
