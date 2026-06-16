import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { IPasswordHasher } from '@modules/Authentication/Application/Interfaces/IPasswordHasher';
import { ITokenService } from '@modules/Authentication/Application/Interfaces/ITokenService';
import { IRefreshTokenRepository } from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';
import { LoginDto } from '@modules/Authentication/Application/DTOs/LoginDto';
import { AuthResultDto } from '@modules/Authentication/Application/DTOs/AuthResultDto';
import { IssueAuthTokens } from '@modules/Authentication/Application/Helpers/IssueAuthTokens';
import { UnauthorizedAppException } from '@common/Exceptions/AppException';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  public async Execute(request: LoginDto): Promise<AuthResultDto> {
    const user = await this.userRepository.FindByEmail(request.EmailAddress.toLowerCase());
    if (!user || !user.PasswordHash) {
      throw new UnauthorizedAppException('Invalid credentials');
    }

    const ok = await this.passwordHasher.Verify(request.Password, user.PasswordHash);
    if (!ok) {
      throw new UnauthorizedAppException('Invalid credentials');
    }

    return IssueAuthTokens(this.tokenService, this.refreshTokenRepository, {
      Id: user.Id,
      EmailAddress: user.EmailAddress.Value,
      Role: user.Role,
    });
  }
}
