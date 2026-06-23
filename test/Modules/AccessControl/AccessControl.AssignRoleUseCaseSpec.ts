import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveRoleFromUserUseCase';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const buildWorld = async () => {
  const roles = new InMemoryRoleRepository();
  await SeedAccessControlRbac(roles, new InMemoryPermissionRepository(), new InMemoryRolePermissionRepository());
  const userRoles = new InMemoryUserRoleRepository();
  return {
    roles,
    userRoles,
    assign: new AssignRoleToUserUseCase(roles, userRoles),
    remove: new RemoveRoleFromUserUseCase(roles, userRoles),
  };
};

describe('AssignRoleToUserUseCase / RemoveRoleFromUserUseCase', () => {
  it('assigns a role to a user with source MANUAL', async () => {
    const world = await buildWorld();
    const userId = randomUUID();

    const result = await world.assign.Execute({ UserId: userId, RoleCode: RoleCode.Qc });
    expect(result.RoleCode).toBe(RoleCode.Qc);
    expect(result.Source).toBe(UserRoleSource.Manual);
    expect(await world.userRoles.FindByUserId(userId)).toHaveLength(1);
  });

  it('rejects assigning an unknown role with NotFound', async () => {
    const world = await buildWorld();
    await expect(world.assign.Execute({ UserId: 'u1', RoleCode: 'NOT_A_ROLE' as RoleCode })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a duplicate assignment with Conflict', async () => {
    const world = await buildWorld();
    await world.assign.Execute({ UserId: 'u1', RoleCode: RoleCode.Operator });
    await expect(world.assign.Execute({ UserId: 'u1', RoleCode: RoleCode.Operator })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('removes an assigned role', async () => {
    const world = await buildWorld();
    await world.assign.Execute({ UserId: 'u1', RoleCode: RoleCode.Operator });

    const result = await world.remove.Execute({ UserId: 'u1', RoleCode: RoleCode.Operator });
    expect(result.Removed).toBe(true);
    expect(await world.userRoles.FindByUserId('u1')).toHaveLength(0);
  });

  it('rejects removing a role the user does not have with NotFound', async () => {
    const world = await buildWorld();
    await expect(world.remove.Execute({ UserId: 'u1', RoleCode: RoleCode.Operator })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
