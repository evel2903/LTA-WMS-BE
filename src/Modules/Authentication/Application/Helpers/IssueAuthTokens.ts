import { Role } from '@common/Constants/Role';
import { Sha256Hex } from '@common/Helpers/Hash';
import { AccessTokenPayload, ITokenService } from '@modules/Authentication/Application/Interfaces/ITokenService';
import { IRefreshTokenRepository } from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';
import { AuthResultDto } from '@modules/Authentication/Application/DTOs/AuthResultDto';

type AuthUser = { Id: string; EmailAddress: string; Role: Role };

/**
 * Signs a fresh access + refresh token pair, persists the (hashed) refresh token
 * so it can later be rotated/revoked, and shapes the auth result.
 * Shared by Login, Register and RefreshToken use cases.
 */
export const IssueAuthTokens = async (
  tokenService: ITokenService,
  refreshTokenRepository: IRefreshTokenRepository,
  user: AuthUser,
): Promise<AuthResultDto> => {
  const payload: AccessTokenPayload = {
    Sub: user.Id,
    EmailAddress: user.EmailAddress,
    Role: user.Role,
  };

  const [access, refresh] = await Promise.all([
    tokenService.SignAccessToken(payload),
    tokenService.SignRefreshToken(payload),
  ]);

  await refreshTokenRepository.Save({
    UserId: user.Id,
    TokenHash: Sha256Hex(refresh.Token),
    ExpiresAt: new Date(Date.now() + refresh.ExpiresInMs),
  });

  return {
    Tokens: {
      AccessToken: access.Token,
      AccessTokenExpiresInMs: access.ExpiresInMs,
      RefreshToken: refresh.Token,
      RefreshTokenExpiresInMs: refresh.ExpiresInMs,
    },
    User: { Id: user.Id, EmailAddress: user.EmailAddress, Role: user.Role },
  };
};
