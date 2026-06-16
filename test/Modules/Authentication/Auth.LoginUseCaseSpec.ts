import { LoginUseCase } from '@modules/Authentication/Application/UseCases/LoginUseCase';
import { UnauthorizedAppException } from '@common/Exceptions/AppException';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { UserEntity } from '@modules/Users/Domain/Entities/UserEntity';
import { IPasswordHasher } from '@modules/Authentication/Application/Interfaces/IPasswordHasher';
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

class FakeUserRepository implements IUserRepository {
  public FindById = jest.fn<Promise<UserEntity | null>, [string]>();
  public FindByEmail = jest.fn<Promise<UserEntity | null>, [string]>();
  public Create = jest.fn<Promise<UserEntity>, [UserEntity]>();
  public Update = jest.fn<Promise<void>, [UserEntity]>();
  public Delete = jest.fn<Promise<void>, [string]>();
  public List = jest.fn<Promise<{ Items: UserEntity[]; TotalItems: number }>, [number, number]>();
}

class FakePasswordHasher implements IPasswordHasher {
  public Hash = jest.fn<Promise<string>, [string]>();
  public Verify = jest.fn<Promise<boolean>, [string, string]>();
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

describe('LoginUseCase', () => {
  it('returns token when credentials are valid', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    repo.FindByEmail.mockResolvedValue(
      new UserEntity({
        Id: 'u1',
        FirstName: 'A',
        LastName: 'B',
        EmailAddress: EmailAddress.Create('test@example.com'),
        PasswordHash: 'hashed',
        Role: Role.User,
        CreatedAt: new Date(),
      }),
    );
    hasher.Verify.mockResolvedValue(true);
    tokenService.SignAccessToken.mockResolvedValue({ Token: 'access', ExpiresInMs: 900000 });
    tokenService.SignRefreshToken.mockResolvedValue({ Token: 'refresh', ExpiresInMs: 604800000 });

    const useCase = new LoginUseCase(repo, hasher, tokenService, new FakeRefreshTokenRepository());
    const result = await useCase.Execute({ EmailAddress: 'TEST@EXAMPLE.COM', Password: 'pw' });

    expect(repo.FindByEmail).toHaveBeenCalledWith('test@example.com');
    expect(hasher.Verify).toHaveBeenCalledWith('pw', 'hashed');
    expect(result.Tokens.AccessToken).toBe('access');
    expect(result.Tokens.RefreshToken).toBe('refresh');
    expect(result.User.EmailAddress).toBe('test@example.com');
  });

  it('throws UnauthorizedAppException when user does not exist', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    repo.FindByEmail.mockResolvedValue(null);
    const useCase = new LoginUseCase(repo, hasher, tokenService, new FakeRefreshTokenRepository());

    await expect(useCase.Execute({ EmailAddress: 'test@example.com', Password: 'pw' })).rejects.toBeInstanceOf(
      UnauthorizedAppException,
    );
  });

  it('throws UnauthorizedAppException when password is wrong', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    repo.FindByEmail.mockResolvedValue(
      new UserEntity({
        Id: 'u1',
        FirstName: 'A',
        LastName: 'B',
        EmailAddress: EmailAddress.Create('test@example.com'),
        PasswordHash: 'hashed',
        Role: Role.User,
        CreatedAt: new Date(),
      }),
    );
    hasher.Verify.mockResolvedValue(false);
    const useCase = new LoginUseCase(repo, hasher, tokenService, new FakeRefreshTokenRepository());

    await expect(useCase.Execute({ EmailAddress: 'test@example.com', Password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedAppException,
    );
  });
});
