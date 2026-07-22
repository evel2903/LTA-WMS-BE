import { RoleController } from '@modules/AccessControl/Presentation/Controllers/RoleController';
import { CreateRoleRequest } from '@modules/AccessControl/Presentation/Requests/CreateRoleRequest';
import { UpdateRoleRequest } from '@modules/AccessControl/Presentation/Requests/UpdateRoleRequest';
import { SetRolePermissionsRequest } from '@modules/AccessControl/Presentation/Requests/SetRolePermissionsRequest';
import { ResetRolePermissionsRequest } from '@modules/AccessControl/Presentation/Requests/ResetRolePermissionsRequest';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
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
    const controller = new RoleController(
      {} as never,
      getRoleUseCase as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await controller.GetByCode('CUSTOM_ROLE');

    expect(getRoleUseCase.Execute).toHaveBeenCalledWith('CUSTOM_ROLE');
  });

  it('Create forwards the request body + actor to CreateRoleUseCase', async () => {
    const createRoleUseCase = { Execute: jest.fn(async () => ({})) };
    const controller = new RoleController(
      {} as never,
      {} as never,
      createRoleUseCase as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const request = Object.assign(new CreateRoleRequest(), { RoleCode: 'NEW_ROLE', RoleName: 'New Role' });

    await controller.Create(request, context, { UserId: 'actor-1' });

    expect(createRoleUseCase.Execute).toHaveBeenCalledWith(
      expect.objectContaining({ RoleCode: 'NEW_ROLE', RoleName: 'New Role', ActorUserId: 'actor-1' }),
      context,
    );
  });

  it('Update forwards the id param + request body to UpdateRoleUseCase', async () => {
    const updateRoleUseCase = { Execute: jest.fn(async () => ({})) };
    const controller = new RoleController(
      {} as never,
      {} as never,
      {} as never,
      updateRoleUseCase as never,
      {} as never,
      {} as never,
    );
    const request = Object.assign(new UpdateRoleRequest(), {
      ExpectedUpdatedAt: '2026-07-22T06:00:00.123Z',
      Status: RoleStatus.Inactive,
    });

    await controller.Update('role-1', request, context, { UserId: 'actor-1' });

    expect(updateRoleUseCase.Execute).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 'role-1',
        ExpectedUpdatedAt: '2026-07-22T06:00:00.123Z',
        Status: RoleStatus.Inactive,
        ActorUserId: 'actor-1',
      }),
      context,
    );
  });

  it('SetPermissions maps the lower-camel request body to the PascalCase use-case DTO and back to a lower-camel response', async () => {
    const setRolePermissionsUseCase = {
      Execute: jest.fn(async () => ({
        Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
        Version: 4,
        UpdatedAt: '2026-07-22T06:00:00.125Z',
      })),
    };
    const controller = new RoleController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      setRolePermissionsUseCase as never,
      {} as never,
    );
    const request = Object.assign(new SetRolePermissionsRequest(), {
      permissions: [{ action: ActionCode.Read, objectType: ObjectType.Role }],
      reasonCode: 'RC-ADMIN-EDIT',
    });

    const response = await controller.SetPermissions('role-1', request, context, { UserId: 'actor-1' });

    expect(setRolePermissionsUseCase.Execute).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 'role-1',
        Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
        ReasonCode: 'RC-ADMIN-EDIT',
        ActorUserId: 'actor-1',
      }),
      context,
    );
    expect(response).toEqual({
      permissions: [{ action: ActionCode.Read, objectType: ObjectType.Role }],
      version: 4,
    });
  });

  it('ResetPermissions maps the lower-camel request body to the PascalCase use-case DTO and back to a lower-camel response', async () => {
    const resetRolePermissionsUseCase = {
      Execute: jest.fn(async () => ({
        Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
        Version: 5,
        UpdatedAt: '2026-07-22T06:00:00.126Z',
      })),
    };
    const controller = new RoleController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      resetRolePermissionsUseCase as never,
    );
    const request = Object.assign(new ResetRolePermissionsRequest(), { reasonCode: 'RC-ADMIN-RESET' });

    const response = await controller.ResetPermissions('role-1', request, context, { UserId: 'actor-1' });

    expect(resetRolePermissionsUseCase.Execute).toHaveBeenCalledWith(
      expect.objectContaining({ Id: 'role-1', ReasonCode: 'RC-ADMIN-RESET', ActorUserId: 'actor-1' }),
      context,
    );
    expect(response).toEqual({
      permissions: [{ action: ActionCode.Read, objectType: ObjectType.Role }],
      version: 5,
    });
  });
});
