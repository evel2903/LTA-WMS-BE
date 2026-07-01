import { ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ReasonCodeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ReasonCodeRepository';

const now = new Date();
const entity = () =>
  new ReasonCodeEntity({
    Id: 'rc1',
    ReasonCode: 'RC-DUP',
    ReasonGroup: ReasonGroup.ManualFix,
    AppliesToActions: [ActionCode.Update],
    AppliesToObjects: [ObjectType.InventoryStatus],
    CreatedAt: now,
    UpdatedAt: now,
  });

describe('ReasonCodeRepository', () => {
  it('maps unique-violation 23505 to ConflictException on create', async () => {
    const orm = { save: jest.fn(async () => Promise.reject({ code: '23505' })) } as never;
    await expect(new ReasonCodeRepository(orm).Create(entity())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps unique-violation 23505 to ConflictException on update', async () => {
    const orm = { save: jest.fn(async () => Promise.reject({ code: '23505' })) } as never;
    await expect(new ReasonCodeRepository(orm).Update(entity())).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows non-unique errors unchanged', async () => {
    const orm = { save: jest.fn(async () => Promise.reject({ code: '23502' })) } as never;
    await expect(new ReasonCodeRepository(orm).Create(entity())).rejects.not.toBeInstanceOf(ConflictException);
  });

  it('combines scalar and JSONB filters', async () => {
    const clauses: Array<{ sql: string; params: Record<string, unknown> }> = [];
    const query = {
      andWhere: jest.fn((sql: string, params: Record<string, unknown>) => {
        clauses.push({ sql, params });
        return query;
      }),
      orderBy: jest.fn(() => query),
      skip: jest.fn(() => query),
      take: jest.fn(() => query),
      getManyAndCount: jest.fn(async () => [[], 0]),
    };
    const orm = { createQueryBuilder: jest.fn(() => query) } as never;

    await new ReasonCodeRepository(orm).List(0, 100, {
      ReasonGroup: ReasonGroup.ManualFix,
      Status: ReasonCodeStatus.Active,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Warehouse,
    });

    expect(clauses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sql: 'rc.ReasonGroup = :group',
          params: { group: ReasonGroup.ManualFix },
        }),
        expect.objectContaining({
          sql: 'rc.Status = :status',
          params: { status: ReasonCodeStatus.Active },
        }),
        expect.objectContaining({
          sql: 'rc.AppliesToActions @> :action::jsonb',
          params: { action: JSON.stringify([ActionCode.Update]) },
        }),
        expect.objectContaining({
          sql: 'rc.AppliesToObjects @> :objectType::jsonb',
          params: { objectType: JSON.stringify([ObjectType.Warehouse]) },
        }),
      ]),
    );
  });
});
