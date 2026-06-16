import { RegisterUseCase } from '../../../src/Modules/Authentication/Application/UseCases/RegisterUseCase';
import { ConflictException } from '../../../src/Common/Exceptions/AppException';
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

describe('RegisterUseCase', () => {
  it('registers user and returns token', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    repo.FindByEmail.mockResolvedValue(null);
    hasher.Hash.mockResolvedValue('hashed');
    tokenService.SignAccessToken.mockResolvedValue({ AccessToken: 'token', ExpiresIn: '1h' });
    repo.Create.mockImplementation(async (user) => user);

    const useCase = new RegisterUseCase(repo, hasher, tokenService);
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
    expect(result.AccessToken).toBe('token');
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

    const useCase = new RegisterUseCase(repo, hasher, tokenService);
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
