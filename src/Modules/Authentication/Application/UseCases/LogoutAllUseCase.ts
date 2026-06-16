import { IRefreshTokenRepository } from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';

/**
 * Logout all devices: revoke every active refresh token for the user.
 */
export class LogoutAllUseCase {
  constructor(private readonly refreshTokenRepository: IRefreshTokenRepository) {}

  public async Execute(userId: string): Promise<void> {
    await this.refreshTokenRepository.RevokeAllForUser(userId);
  }
}
