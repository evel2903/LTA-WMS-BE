import { Sha256Hex } from '@common/Helpers/Hash';
import { IRefreshTokenRepository } from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';

/**
 * Logout this device: revoke the single refresh token presented in the cookie.
 * Idempotent — revoking an unknown/already-revoked token is a no-op.
 */
export class LogoutUseCase {
  constructor(private readonly refreshTokenRepository: IRefreshTokenRepository) {}

  public async Execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    await this.refreshTokenRepository.RevokeByHash(Sha256Hex(refreshToken));
  }
}
