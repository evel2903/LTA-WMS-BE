import { RoleController } from '@modules/AccessControl/Presentation/Controllers/RoleController';
import { CreateRoleRequest } from '@modules/AccessControl/Presentation/Requests/CreateRoleRequest';
import { UpdateRoleRequest } from '@modules/AccessControl/Presentation/Requests/UpdateRoleRequest';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';

const context: AuditContext = {
  ActorUserId: 'actor-1',
  ActorRoleCodes: [],
  ActorType: ActorType.User,
  CorrelationId: null,
  RequestId: null,
  IpAddress: null,
  UserAgent: null,
};

describe('RoleController', () => {
  it('GetByCode passes the raw string param through (no enum parsing)', async () => {
    const getRoleUseCase = { Execute: jest.fn(async () => ({})) };
    const controller = new RoleController({} as never, getRoleUseCase as never, {} as never, {} as never);

    await controller.GetByCode('CUSTOM_ROLE');

    expect(getRoleUseCase.Execute).toHaveBeenCalledWith('CUSTOM_ROLE');
  });

  it('Create forwards the request body + actor to CreateRoleUseCase', async () => {
    const createRoleUseCase = { Execute: jest.fn(async () => ({})) };
    const controller = new RoleController({} as never, {} as never, createRoleUseCase as never, {} as never);
    const request = Object.assign(new CreateRoleRequest(), { RoleCode: 'NEW_ROLE', RoleName: 'New Role' });

    await controller.Create(request, context, { UserId: 'actor-1' });

    expect(createRoleUseCase.Execute).toHaveBeenCalledWith(
      expect.objectContaining({ RoleCode: 'NEW_ROLE', RoleName: 'New Role', ActorUserId: 'actor-1' }),
      context,
    );
  });

  it('Update forwards the id param + request body to UpdateRoleUseCase', async () => {
    const updateRoleUseCase = { Execute: jest.fn(async () => ({})) };
    const controller = new RoleController({} as never, {} as never, {} as never, updateRoleUseCase as never);
    const request = Object.assign(new UpdateRoleRequest(), { Status: RoleStatus.Inactive });

    await controller.Update('role-1', request, context, { UserId: 'actor-1' });

    expect(updateRoleUseCase.Execute).toHaveBeenCalledWith(
      expect.objectContaining({ Id: 'role-1', Status: RoleStatus.Inactive, ActorUserId: 'actor-1' }),
      context,
    );
  });
});
