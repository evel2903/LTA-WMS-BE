import { Role } from '../../../../Common/Constants/Role';

export type AccessTokenPayload = {
  Sub: string;
  EmailAddress: string;
  Role: Role;
};

export type TokenPair = {
  AccessToken: string;
  ExpiresIn: string;
};

export const TOKEN_SERVICE = Symbol('ITokenService');

export interface ITokenService {
  SignAccessToken(payload: AccessTokenPayload): Promise<TokenPair>;
}
