import { ConflictException } from '@common/Exceptions/AppException';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { DataScopeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/DataScopeRepository';

const now = new Date();
const aScope = () =>
  new DataScopeEntity({
    Id: 'ds1',
    PrincipalType: PrincipalType.Role,
    PrincipalId: 'role-1',
    ScopeType: DataScopeType.Warehouse,
    ScopeValueId: 'W1',
    CreatedAt: now,
    UpdatedAt: now,
  });

describe('DataScopeRepository', () => {
  it('maps unique-violation 23505 to ConflictException', async () => {
    const orm = { save: jest.fn(async () => Promise.reject({ code: '23505' })) } as never;
    await expect(new DataScopeRepository(orm).Create(aScope())).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows non-unique errors unchanged', async () => {
    const orm = { save: jest.fn(async () => Promise.reject({ code: '23502' })) } as never;
    await expect(new DataScopeRepository(orm).Create(aScope())).rejects.not.toBeInstanceOf(ConflictException);
  });

  it('FindByPrincipals short-circuits on empty input (no IN () query)', async () => {
    const createQueryBuilder = jest.fn();
    const orm = { createQueryBuilder } as never;
    const result = await new DataScopeRepository(orm).FindByPrincipals([]);
    expect(result).toEqual([]);
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });
});
