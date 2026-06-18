import { RefreshTokenUseCase } from '@modules/Authentication/Application/UseCases/RefreshTokenUseCase';
import { UnauthorizedAppException } from '@common/Exceptions/AppException';
import { Sha256Hex } from '@common/Helpers/Hash';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { UserEntity } from '@modules/Users/Domain/Entities/UserEntity';
import {
  AccessTokenPayload,
  ITokenService,
  SignedToken,
} from '@modules/Authentication/Application/Interfaces/ITokenService';
import {
  CreateRefreshTokenInput,
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';
import { Role } from '@common/Constants/Role';
import { EmailAddress } from '@modules/Users/Domain/ValueObjects/EmailAddress';
import { REFRESH_TOKEN_ROTATION_GRACE_MS } from '@modules/Authentication/AuthConstants';

class FakeUserRepository implements IUserRepository {
  public FindById = jest.fn<Promise<UserEntity | null>, [string]>();
  public FindByEmail = jest.fn<Promise<UserEntity | null>, [string]>();
  public Create = jest.fn<Promise<UserEntity>, [UserEntity]>();
  public Update = jest.fn<Promise<void>, [UserEntity]>();
  public Delete = jest.fn<Promise<void>, [string]>();
  public List = jest.fn<Promise<{ Items: UserEntity[]; TotalItems: number }>, [number, number]>();
}

class FakeTokenService implements ITokenService {
  public SignAccessToken = jest.fn<Promise<SignedToken>, [AccessTokenPayload]>();
  public SignRefreshToken = jest.fn<Promise<SignedToken>, [AccessTokenPayload]>();
  public VerifyRefreshToken = jest.fn<Promise<AccessTokenPayload>, [string]>();
}

class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  public Save = jest.fn<Promise<void>, [CreateRefreshTokenInput]>();
  public FindByHash = jest.fn<Promise<RefreshTokenRecord | null>, [string]>();
  public RevokeByHash = jest.fn<Promise<void>, [string]>();
  public RevokeAllForUser = jest.fn<Promise<void>, [string]>();
}

const INCOMING = 'incoming-refresh';
const INCOMING_HASH = Sha256Hex(INCOMING);

const activeRecord = (): RefreshTokenRecord => ({
  Id: 'rt1',
  UserId: 'u1',
  TokenHash: INCOMING_HASH,
  ExpiresAt: new Date(Date.now() + 60_000),
  RevokedAt: null,
  CreatedAt: new Date(),
});

const buildUser = () =>
  new UserEntity({
    Id: 'u1',
    FirstName: 'A',
    LastName: 'B',
    EmailAddress: EmailAddress.Create('test@example.com'),
    PasswordHash: 'hashed',
    Role: Role.User,
    CreatedAt: new Date(),
  });

const setup = () => {
  const repo = new FakeUserRepository();
  const tokenService = new FakeTokenService();
  const refreshRepo = new FakeRefreshTokenRepository();
  tokenService.VerifyRefreshToken.mockResolvedValue({ Sub: 'u1', EmailAddress: 'test@example.com', Role: Role.User });
  tokenService.SignAccessToken.mockResolvedValue({ Token: 'new-access', ExpiresInMs: 900000 });
  tokenService.SignRefreshToken.mockResolvedValue({ Token: 'new-refresh', ExpiresInMs: 604800000 });
  return { repo, tokenService, refreshRepo, useCase: new RefreshTokenUseCase(repo, tokenService, refreshRepo) };
};

describe('RefreshTokenUseCase', () => {
  it('rotates: revokes the presented token, saves a new one, returns a fresh pair', async () => {
    const { repo, refreshRepo, useCase } = setup();
    refreshRepo.FindByHash.mockResolvedValue(activeRecord());
    repo.FindById.mockResolvedValue(buildUser());

    const result = await useCase.Execute(INCOMING);

    expect(refreshRepo.FindByHash).toHaveBeenCalledWith(INCOMING_HASH);
    expect(refreshRepo.RevokeByHash).toHaveBeenCalledWith(INCOMING_HASH);
    expect(refreshRepo.Save).toHaveBeenCalledTimes(1);
    expect(result.Tokens.AccessToken).toBe('new-access');
    expect(result.Tokens.RefreshToken).toBe('new-refresh');
  });

  it('detects reuse: a token revoked LONG ago (beyond grace) revokes ALL user tokens and throws', async () => {
    const { repo, refreshRepo, useCase } = setup();
    const longAgo = new Date(Date.now() - REFRESH_TOKEN_ROTATION_GRACE_MS - 60_000);
    refreshRepo.FindByHash.mockResolvedValue({ ...activeRecord(), RevokedAt: longAgo });

    await expect(useCase.Execute(INCOMING)).rejects.toBeInstanceOf(UnauthorizedAppException);
    expect(refreshRepo.RevokeAllForUser).toHaveBeenCalledWith('u1');
    expect(refreshRepo.RevokeByHash).not.toHaveBeenCalled();
    expect(repo.FindById).not.toHaveBeenCalled();
  });

  it('tolerates rotation race: a token revoked WITHIN the grace window throws WITHOUT nuking the family', async () => {
    const { repo, refreshRepo, useCase } = setup();
    // The losing request of a benign race (e.g. two tabs / reload during an in-flight
    // refresh) replays a token that was just rotated. The winner already issued a fresh
    // pair, so we must NOT revoke every token — that would log the surviving tab out.
    const justNow = new Date(Date.now() - 1_000);
    refreshRepo.FindByHash.mockResolvedValue({ ...activeRecord(), RevokedAt: justNow });

    await expect(useCase.Execute(INCOMING)).rejects.toBeInstanceOf(UnauthorizedAppException);
    expect(refreshRepo.RevokeAllForUser).not.toHaveBeenCalled();
    expect(refreshRepo.RevokeByHash).not.toHaveBeenCalled();
    expect(repo.FindById).not.toHaveBeenCalled();
  });

  it('throws when the token is not persisted', async () => {
    const { refreshRepo, useCase } = setup();
    refreshRepo.FindByHash.mockResolvedValue(null);

    await expect(useCase.Execute(INCOMING)).rejects.toBeInstanceOf(UnauthorizedAppException);
    expect(refreshRepo.RevokeByHash).not.toHaveBeenCalled();
  });

  it('throws when the JWT itself is invalid (never touches the store)', async () => {
    const { tokenService, refreshRepo, useCase } = setup();
    tokenService.VerifyRefreshToken.mockRejectedValue(new UnauthorizedAppException('bad'));

    await expect(useCase.Execute('bad')).rejects.toBeInstanceOf(UnauthorizedAppException);
    expect(refreshRepo.FindByHash).not.toHaveBeenCalled();
  });

  it('revokes all and throws when the user no longer exists', async () => {
    const { repo, refreshRepo, useCase } = setup();
    refreshRepo.FindByHash.mockResolvedValue(activeRecord());
    repo.FindById.mockResolvedValue(null);

    await expect(useCase.Execute(INCOMING)).rejects.toBeInstanceOf(UnauthorizedAppException);
    expect(refreshRepo.RevokeAllForUser).toHaveBeenCalledWith('u1');
  });
});
