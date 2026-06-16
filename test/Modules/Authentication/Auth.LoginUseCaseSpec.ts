import { LoginUseCase } from '../../../src/Modules/Authentication/Application/UseCases/LoginUseCase';
import { UnauthorizedAppException } from '../../../src/Common/Exceptions/AppException';
import { IUserRepository } from '../../../src/Modules/Users/Domain/Interfaces/IUserRepository';
import { UserEntity } from '../../../src/Modules/Users/Domain/Entities/UserEntity';
import { IPasswordHasher } from '../../../src/Modules/Authentication/Domain/Interfaces/IPasswordHasher';
import {
  AccessTokenPayload,
  ITokenService,
  TokenPair,
} from '../../../src/Modules/Authentication/Domain/Interfaces/ITokenService';
import { Role } from '../../../src/Common/Constants/Role';
import { EmailAddress } from '../../../src/Modules/Users/Domain/ValueObjects/EmailAddress';

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
  public SignAccessToken = jest.fn<Promise<TokenPair>, [AccessTokenPayload]>();
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
    tokenService.SignAccessToken.mockResolvedValue({ AccessToken: 'token', ExpiresIn: '1h' });

    const useCase = new LoginUseCase(repo, hasher, tokenService);
    const result = await useCase.Execute({ EmailAddress: 'TEST@EXAMPLE.COM', Password: 'pw' });

    expect(repo.FindByEmail).toHaveBeenCalledWith('test@example.com');
    expect(hasher.Verify).toHaveBeenCalledWith('pw', 'hashed');
    expect(result.AccessToken).toBe('token');
  });

  it('throws UnauthorizedAppException when user does not exist', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    repo.FindByEmail.mockResolvedValue(null);
    const useCase = new LoginUseCase(repo, hasher, tokenService);

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
    const useCase = new LoginUseCase(repo, hasher, tokenService);

    await expect(useCase.Execute({ EmailAddress: 'test@example.com', Password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedAppException,
    );
  });
});
