import { ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
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
});
