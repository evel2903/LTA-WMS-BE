import { Role } from '@common/Constants/Role';

export type IssuedTokens = {
  AccessToken: string;
  AccessTokenExpiresInMs: number;
  RefreshToken: string;
  RefreshTokenExpiresInMs: number;
};

export type AuthResultDto = {
  Tokens: IssuedTokens;
  User: { Id: string; EmailAddress: string; Role: Role };
};
