import { Role } from '@common/Constants/Role';

export type AccessTokenPayload = {
  Sub: string;
  EmailAddress: string;
  Role: Role;
};

export type SignedToken = {
  Token: string;
  ExpiresInMs: number;
};

export const TOKEN_SERVICE = Symbol('ITokenService');

export interface ITokenService {
  SignAccessToken(payload: AccessTokenPayload): Promise<SignedToken>;
  SignRefreshToken(payload: AccessTokenPayload): Promise<SignedToken>;
  VerifyRefreshToken(token: string): Promise<AccessTokenPayload>;
}
