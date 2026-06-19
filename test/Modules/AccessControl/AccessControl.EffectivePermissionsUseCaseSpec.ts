import { randomUUID } from 'crypto';
import { Role as LegacyRole } from '@common/Constants/Role';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { BridgeLegacyUserRoles } from '@modules/AccessControl/Application/Services/LegacyRoleBridge';
import { GetUserEffectivePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/GetUserEffectivePermissionsUseCase';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
} from '@modules/AccessControl/Test/AccessControlTestDoubles';

const buildSeededWorld = async () => {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  const userRoles = new InMemoryUserRoleRepository();
  await SeedAccessControlRbac(roles, permissions, rolePermissions);
  const effective = new GetUserEffectivePermissionsUseCase(userRoles, roles, rolePermissions, permissions);
  return { roles, permissions, rolePermissions, userRoles, effective };
};

const hasPermission = (
  result: { Permissions: Array<{ Action: ActionCode; ObjectType: ObjectType }> },
  action: ActionCode,
  objectType: ObjectType,
): boolean => result.Permissions.some((p) => p.Action === action && p.ObjectType === objectType);

describe('GetUserEffectivePermissionsUseCase', () => {
  it('returns an empty set for a user with no roles (deny by default)', async () => {
    const { effective } = await buildSeededWorld();
    const result = await effective.Execute('nobody');
    expect(result.Roles).toEqual([]);
    expect(result.Permissions).toEqual([]);
  });

  it('resolves a bridged admin user to admin role and admin permissions', async () => {
    const world = await buildSeededWorld();
    await BridgeLegacyUserRoles([{ Id: 'admin-user', Role: LegacyRole.Admin }], world.roles, world.userRoles);

    const result = await world.effective.Execute('admin-user');
    expect(result.Roles).toEqual([RoleCode.WmsAdmin]);
    expect(hasPermission(result, ActionCode.Create, ObjectType.Role)).toBe(true);
    expect(hasPermission(result, ActionCode.Read, ObjectType.AuditLog)).toBe(true);
  });

  it('resolves a bridged operator user to a restricted read set without Role admin grants', async () => {
    const world = await buildSeededWorld();
    await BridgeLegacyUserRoles([{ Id: 'op-user', Role: LegacyRole.User }], world.roles, world.userRoles);

    const result = await world.effective.Execute('op-user');
    expect(result.Roles).toEqual([RoleCode.Operator]);
    expect(hasPermission(result, ActionCode.Read, ObjectType.Warehouse)).toBe(true);
    expect(hasPermission(result, ActionCode.Create, ObjectType.Role)).toBe(false);
  });

  it('unions permissions across multiple roles and de-duplicates them', async () => {
    const world = await buildSeededWorld();
    const assign = new AssignRoleToUserUseCase(world.roles, world.userRoles);
    const userId = randomUUID();
    await assign.Execute({ UserId: userId, RoleCode: RoleCode.Operator });
    await assign.Execute({ UserId: userId, RoleCode: RoleCode.WarehouseSupervisor });

    const result = await world.effective.Execute(userId);
    expect(result.Roles).toEqual(expect.arrayContaining([RoleCode.Operator, RoleCode.WarehouseSupervisor]));
    // Supervisor adds Approve on ApprovalRequest that operator lacks.
    expect(hasPermission(result, ActionCode.Approve, ObjectType.ApprovalRequest)).toBe(true);
    // No duplicate permission entries.
    const codes = result.Permissions.map((p) => `${p.Action}:${p.ObjectType}`);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
