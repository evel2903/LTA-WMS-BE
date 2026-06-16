export const REFRESH_TOKEN_REPOSITORY = Symbol('IRefreshTokenRepository');

export type RefreshTokenRecord = {
  Id: string;
  UserId: string;
  TokenHash: string;
  ExpiresAt: Date;
  RevokedAt: Date | null;
  CreatedAt: Date;
};

export type CreateRefreshTokenInput = {
  UserId: string;
  TokenHash: string;
  ExpiresAt: Date;
};

export interface IRefreshTokenRepository {
  Save(input: CreateRefreshTokenInput): Promise<void>;
  FindByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  RevokeByHash(tokenHash: string): Promise<void>;
  RevokeAllForUser(userId: string): Promise<void>;
}
