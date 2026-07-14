import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@modules/AccessControl/Application/UseCases/UpdateRoleUseCase';
import { InMemoryRoleRepository } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

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
    const repo = new InMemoryRoleRepository();
    await expect(new UpdateRoleUseCase(repo).Execute({ Id: 'missing', RoleName: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates role_name/description on a custom role and leaves role_code unchanged', async () => {
    const repo = new InMemoryRoleRepository();
    const created = await new CreateRoleUseCase(repo).Execute({ RoleCode: 'CUSTOM_ROLE', RoleName: 'Old Name' });

    const updated = await new UpdateRoleUseCase(repo).Execute({
      Id: created.Id,
      RoleName: 'New Name',
      Description: 'updated desc',
    });

    expect(updated.RoleName).toBe('New Name');
    expect(updated.Description).toBe('updated desc');
    expect(updated.RoleCode).toBe('CUSTOM_ROLE');
  });

  it('allows deactivating a custom role via status', async () => {
    const repo = new InMemoryRoleRepository();
    const created = await new CreateRoleUseCase(repo).Execute({ RoleCode: 'CUSTOM_ROLE_2', RoleName: 'A' });

    const updated = await new UpdateRoleUseCase(repo).Execute({ Id: created.Id, Status: RoleStatus.Inactive });
    expect(updated.Status).toBe(RoleStatus.Inactive);
  });

  it('allows editing role_name on a system role but rejects changing its status', async () => {
    const repo = new InMemoryRoleRepository();
    const systemRole = await repo.Create(
      new RoleEntity({
        Id: 'sys-1',
        RoleCode: 'WMS_ADMIN',
        RoleName: 'WMS Admin',
        IsSystem: true,
        Status: RoleStatus.Active,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );

    const updated = await new UpdateRoleUseCase(repo).Execute({ Id: systemRole.Id, RoleName: 'Renamed Admin' });
    expect(updated.RoleName).toBe('Renamed Admin');
    expect(updated.IsSystem).toBe(true);

    await expect(
      new UpdateRoleUseCase(repo).Execute({ Id: systemRole.Id, Status: RoleStatus.Inactive }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });
});
