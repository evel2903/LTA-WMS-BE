import { RegisterUseCase } from '@modules/Authentication/Application/UseCases/RegisterUseCase';
import { ConflictException } from '@common/Exceptions/AppException';
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

describe('RegisterUseCase', () => {
  it('registers user and returns token', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    repo.FindByEmail.mockResolvedValue(null);
    hasher.Hash.mockResolvedValue('hashed');
    tokenService.SignAccessToken.mockResolvedValue({ Token: 'access', ExpiresInMs: 900000 });
    tokenService.SignRefreshToken.mockResolvedValue({ Token: 'refresh', ExpiresInMs: 604800000 });
    repo.Create.mockImplementation(async (user) => user);

    const useCase = new RegisterUseCase(repo, hasher, tokenService, new FakeRefreshTokenRepository());
    const result = await useCase.Execute({
      FirstName: 'A',
      LastName: 'B',
      EmailAddress: 'Test@Example.com',
      Password: 'P@ssw0rd!',
    });

    expect(hasher.Hash).toHaveBeenCalledWith('P@ssw0rd!');
    expect(repo.Create).toHaveBeenCalledTimes(1);
    expect(tokenService.SignAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ EmailAddress: 'test@example.com', Role: Role.User }),
    );
    expect(result.Tokens.AccessToken).toBe('access');
    expect(result.Tokens.RefreshToken).toBe('refresh');
    expect(result.User.EmailAddress).toBe('test@example.com');
  });

  it('throws ConflictException when email already exists', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    repo.FindByEmail.mockResolvedValue(
      new UserEntity({
        Id: 'u1',
        FirstName: 'Existing',
        LastName: 'User',
        EmailAddress: EmailAddress.Create('test@example.com'),
        PasswordHash: 'x',
        Role: Role.User,
        CreatedAt: new Date(),
      }),
    );

    const useCase = new RegisterUseCase(repo, hasher, tokenService, new FakeRefreshTokenRepository());
    await expect(
      useCase.Execute({
        FirstName: 'A',
        LastName: 'B',
        EmailAddress: 'test@example.com',
        Password: 'P@ssw0rd!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
