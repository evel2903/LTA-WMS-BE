import { CreateUserUseCase } from '../../../src/Modules/Users/Application/UseCases/CreateUserUseCase';
import { ConflictException } from '../../../src/Common/Exceptions/AppException';
import { IUserRepository } from '../../../src/Modules/Users/Domain/Interfaces/IUserRepository';
import { UserEntity } from '../../../src/Modules/Users/Domain/Entities/UserEntity';
import { EmailAddress } from '../../../src/Modules/Users/Domain/ValueObjects/EmailAddress';

class FakeUserRepository implements IUserRepository {
  public FindById = jest.fn<Promise<UserEntity | null>, [string]>();
  public FindByEmail = jest.fn<Promise<UserEntity | null>, [string]>();
  public Create = jest.fn<Promise<UserEntity>, [UserEntity]>();
  public Update = jest.fn<Promise<void>, [UserEntity]>();
  public Delete = jest.fn<Promise<void>, [string]>();
  public List = jest.fn<Promise<{ Items: UserEntity[]; TotalItems: number }>, [number, number]>();
}

describe('CreateUserUseCase', () => {
  it('creates user when email is unique', async () => {
    const repo = new FakeUserRepository();
    repo.FindByEmail.mockResolvedValue(null);
    repo.Create.mockImplementation(async (user) => user);

    const useCase = new CreateUserUseCase(repo);
    const created = await useCase.Execute({
      FirstName: 'A',
      LastName: 'B',
      EmailAddress: 'Test@Example.com',
    });

    expect(repo.FindByEmail).toHaveBeenCalledWith('test@example.com');
    expect(repo.Create).toHaveBeenCalledTimes(1);
    expect(created.EmailAddress).toBe('test@example.com');
  });

  it('throws ConflictException when email already exists', async () => {
    const repo = new FakeUserRepository();
    repo.FindByEmail.mockResolvedValue(
      new UserEntity({
        Id: 'u1',
        FirstName: 'Existing',
        LastName: 'User',
        EmailAddress: EmailAddress.Create('test@example.com'),
        CreatedAt: new Date(),
      }),
    );

    const useCase = new CreateUserUseCase(repo);

    await expect(
      useCase.Execute({
        FirstName: 'A',
        LastName: 'B',
        EmailAddress: 'test@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
