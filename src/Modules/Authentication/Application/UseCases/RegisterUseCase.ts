import { randomUUID } from 'crypto';
import { Role } from '@common/Constants/Role';
import { ConflictException } from '@common/Exceptions/AppException';
import { EmailAddress } from '@modules/Users/Domain/ValueObjects/EmailAddress';
import { UserEntity } from '@modules/Users/Domain/Entities/UserEntity';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { IPasswordHasher } from '@modules/Authentication/Application/Interfaces/IPasswordHasher';
import { ITokenService } from '@modules/Authentication/Application/Interfaces/ITokenService';
import { IRefreshTokenRepository } from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';
import { RegisterDto } from '@modules/Authentication/Application/DTOs/RegisterDto';
import { AuthResultDto } from '@modules/Authentication/Application/DTOs/AuthResultDto';
import { IssueAuthTokens } from '@modules/Authentication/Application/Helpers/IssueAuthTokens';

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
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

    return IssueAuthTokens(this.tokenService, this.refreshTokenRepository, {
      Id: created.Id,
      EmailAddress: created.EmailAddress.Value,
      Role: created.Role,
    });
  }
}
