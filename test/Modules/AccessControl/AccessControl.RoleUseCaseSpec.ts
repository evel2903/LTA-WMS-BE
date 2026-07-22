import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@modules/AccessControl/Application/UseCases/UpdateRoleUseCase';
import {
  InMemoryRoleRepository,
  StubAuditedTransaction,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const BASE_UPDATED_AT = new Date('2026-07-22T06:00:00.123Z');

const seedRole = async (
  repo: InMemoryRoleRepository,
  overrides: Partial<ConstructorParameters<typeof RoleEntity>[0]> = {},
) =>
  repo.Create(
    new RoleEntity({
      Id: 'role-1',
      RoleCode: 'CUSTOM_ROLE',
      RoleName: 'Original name',
      Description: null,
      IsSystem: false,
      Status: RoleStatus.Active,
      CreatedAt: new Date('2026-07-22T05:00:00.000Z'),
      UpdatedAt: BASE_UPDATED_AT,
      ...overrides,
    }),
  );

const updateWorld = () => {
  const repo = new InMemoryRoleRepository();
  const audited = new StubAuditedTransaction();
  const useCase = new UpdateRoleUseCase(repo, audited as never);
  return { repo, audited, useCase };
};

describe('CreateRoleUseCase / UpdateRoleUseCase', () => {
  it('creates a custom role as Active, non-system, uppercased', async () => {
    const repo = new InMemoryRoleRepository();
    const dto = await new CreateRoleUseCase(repo).Execute({ RoleCode: 'inventory_lead', RoleName: 'Inventory Lead' });

    expect(dto.RoleCode).toBe('INVENTORY_LEAD');
    expect(dto.IsSystem).toBe(false);
    expect(dto.Status).toBe(RoleStatus.Active);
  });

  it('rejects a role_code that does not match the format regex', async () => {
    const repo = new InMemoryRoleRepository();
    await expect(
      new CreateRoleUseCase(repo).Execute({ RoleCode: '1BAD-CODE', RoleName: 'Bad' }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects a duplicate role_code with ConflictException', async () => {
    const repo = new InMemoryRoleRepository();
    const useCase = new CreateRoleUseCase(repo);
    await useCase.Execute({ RoleCode: 'DUP_ROLE', RoleName: 'A' });
    await expect(useCase.Execute({ RoleCode: 'dup_role', RoleName: 'B' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFound when updating a missing role', async () => {
    const { useCase } = updateWorld();
    await expect(
      useCase.Execute({
        Id: 'missing',
        ExpectedUpdatedAt: BASE_UPDATED_AT.toISOString(),
        RoleName: 'X',
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates canonical metadata, advances the server token and appends exactly one audit entry', async () => {
    const { repo, audited, useCase } = updateWorld();
    const created = await seedRole(repo);

    const updated = await useCase.Execute({
      Id: created.Id,
      ExpectedUpdatedAt: BASE_UPDATED_AT.toISOString(),
      RoleName: '  New Name  ',
      Description: 'updated desc',
    } as never);

    expect(updated.RoleName).toBe('New Name');
    expect(updated.Description).toBe('updated desc');
    expect(updated.RoleCode).toBe('CUSTOM_ROLE');
    expect(new Date((updated as unknown as { UpdatedAt: string }).UpdatedAt).getTime()).toBeGreaterThan(
      BASE_UPDATED_AT.getTime(),
    );
    expect(audited.Entries).toHaveLength(1);
  });

  it('returns exact stale conflict details and performs no write or audit', async () => {
    const { repo, audited, useCase } = updateWorld();
    const role = await seedRole(repo);
    const update = jest.spyOn(repo, 'Update');

    const promise = useCase.Execute({
      Id: role.Id,
      ExpectedUpdatedAt: new Date(BASE_UPDATED_AT.getTime() - 1).toISOString(),
      RoleName: 'Stale write',
    } as never);

    await expect(promise).rejects.toMatchObject({
      Details: {
        Reason: 'ROLE_METADATA_STALE',
        CurrentUpdatedAt: BASE_UPDATED_AT.toISOString(),
      },
    });
    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
    expect(audited.Entries).toHaveLength(0);
  });

  it.each([
    ['token-only', {}],
    ['same canonical name', { RoleName: '  Original name  ' }],
    ['null and empty description equivalence', { Description: '' }],
    ['same custom status', { Status: RoleStatus.Active }],
  ])('treats %s as a no-op without Update, actor/timestamp change or audit', async (_label, patch) => {
    const { repo, audited, useCase } = updateWorld();
    const role = await seedRole(repo, { UpdatedBy: 'original-actor' });
    const update = jest.spyOn(repo, 'Update');

    const result = await useCase.Execute({
      Id: role.Id,
      ExpectedUpdatedAt: BASE_UPDATED_AT.toISOString(),
      ActorUserId: 'new-actor',
      ...patch,
    } as never);

    expect((result as unknown as { UpdatedAt: string }).UpdatedAt).toBe(BASE_UPDATED_AT.toISOString());
    expect(update).not.toHaveBeenCalled();
    expect((await repo.FindById(role.Id))?.UpdatedBy).toBe('original-actor');
    expect(audited.Entries).toHaveLength(0);
  });

  it('rejects supplied Status on a system role before evaluating a stale token', async () => {
    const { repo, audited, useCase } = updateWorld();
    const systemRole = await seedRole(repo, {
      Id: 'sys-1',
      RoleCode: 'WMS_ADMIN',
      RoleName: 'WMS Admin',
      IsSystem: true,
    });
    const update = jest.spyOn(repo, 'Update');

    await expect(
      useCase.Execute({
        Id: systemRole.Id,
        ExpectedUpdatedAt: new Date(BASE_UPDATED_AT.getTime() - 1).toISOString(),
        Status: RoleStatus.Active,
      } as never),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(update).not.toHaveBeenCalled();
    expect(audited.Entries).toHaveLength(0);
  });

  it('still allows editing name/description on a system role when the token matches', async () => {
    const { repo, useCase } = updateWorld();
    const systemRole = await seedRole(repo, {
      Id: 'sys-2',
      RoleCode: 'QC',
      RoleName: 'QC',
      IsSystem: true,
    });

    const updated = await useCase.Execute({
      Id: systemRole.Id,
      ExpectedUpdatedAt: BASE_UPDATED_AT.toISOString(),
      RoleName: '  Quality Control  ',
    } as never);
    expect(updated.RoleName).toBe('Quality Control');
    expect(updated.IsSystem).toBe(true);
  });
});
