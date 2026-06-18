import { Sha256Hex } from '@common/Helpers/Hash';
import { UnauthorizedAppException } from '@common/Exceptions/AppException';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { ITokenService } from '@modules/Authentication/Application/Interfaces/ITokenService';
import { IRefreshTokenRepository } from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';
import { AuthResultDto } from '@modules/Authentication/Application/DTOs/AuthResultDto';
import { IssueAuthTokens } from '@modules/Authentication/Application/Helpers/IssueAuthTokens';
import { REFRESH_TOKEN_ROTATION_GRACE_MS } from '@modules/Authentication/AuthConstants';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  public async Execute(refreshToken: string): Promise<AuthResultDto> {
    // 1. Cryptographically valid (signature + expiry) and is a refresh token.
    const payload = await this.tokenService.VerifyRefreshToken(refreshToken);

    // 2. Must correspond to a persisted token.
    const tokenHash = Sha256Hex(refreshToken);
    const stored = await this.refreshTokenRepository.FindByHash(tokenHash);
    if (!stored) {
      throw new UnauthorizedAppException('Refresh token is not recognized');
    }

    // 3. Replay of an already-rotated token. Two cases:
    //    a) BENIGN race (multiple tabs, or a reload that aborts an in-flight
    //       refresh) replays the just-rotated token within the grace window. The
    //       winning request already issued a fresh pair, so reject this loser
    //       WITHOUT revoking the family — that would log the surviving session out.
    //    b) Real reuse/theft: a replay long after rotation. Revoke everything.
    if (stored.RevokedAt) {
      const elapsedSinceRevoke = Date.now() - stored.RevokedAt.getTime();
      if (elapsedSinceRevoke > REFRESH_TOKEN_ROTATION_GRACE_MS) {
        await this.refreshTokenRepository.RevokeAllForUser(stored.UserId);
        throw new UnauthorizedAppException('Refresh token reuse detected');
      }
      throw new UnauthorizedAppException('Refresh token already rotated');
    }

    if (stored.ExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedAppException('Refresh token has expired');
    }

    // 4. Re-fetch the user so a deleted account or changed role is reflected.
    const user = await this.userRepository.FindById(payload.Sub);
    if (!user) {
      await this.refreshTokenRepository.RevokeAllForUser(stored.UserId);
      throw new UnauthorizedAppException('User no longer exists');
    }

    // 5. Rotate: revoke the presented token, then issue (and persist) a new pair.
    await this.refreshTokenRepository.RevokeByHash(tokenHash);

    return IssueAuthTokens(this.tokenService, this.refreshTokenRepository, {
      Id: user.Id,
      EmailAddress: user.EmailAddress.Value,
      Role: user.Role,
    });
  }
}
