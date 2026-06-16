import { IUserRepository } from '../../../Users/Domain/Interfaces/IUserRepository';
import { IPasswordHasher } from '../../Domain/Interfaces/IPasswordHasher';
import { ITokenService } from '../../Domain/Interfaces/ITokenService';
import { LoginDto } from '../DTOs/LoginDto';
import { AuthResultDto } from '../DTOs/AuthResultDto';
import { UnauthorizedAppException } from '../../../../Common/Exceptions/AppException';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
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

    const token = await this.tokenService.SignAccessToken({
      Sub: user.Id,
      EmailAddress: user.EmailAddress.Value,
      Role: user.Role,
    });

    return {
      AccessToken: token.AccessToken,
      ExpiresIn: token.ExpiresIn,
      User: { Id: user.Id, EmailAddress: user.EmailAddress.Value, Role: user.Role },
    };
  }
}
