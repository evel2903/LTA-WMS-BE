import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Role as LegacyRole } from '@common/Constants/Role';
import { IAssignmentLedgerRepository } from '@modules/AccessControl/Application/Interfaces/IAssignmentLedgerRepository';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { BridgeLegacyUserRoles } from '@modules/AccessControl/Application/Services/LegacyRoleBridge';
import { GetUserEffectivePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/GetUserEffectivePermissionsUseCase';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import {
  InMemoryRoleRepository,
  InMemoryRoleCatalogRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const buildSeededWorld = async () => {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  const userRoles = new InMemoryUserRoleRepository();
  await SeedAccessControlRbac(roles, permissions, rolePermissions, new InMemoryRoleCatalogRepository(roles));
  // RH-04: the use case now also reports the per-user EffectiveVersion; these unit tests don't
  // exercise the ledger, so a stub source ('0') satisfies the dependency without a DB.
  const dataSource = { transaction: async (cb: (m: unknown) => unknown) => cb({}) } as unknown as DataSource;
  const ledger = { ReadEffectiveVersionShared: async () => '0' } as unknown as IAssignmentLedgerRepository;
  const effective = new GetUserEffectivePermissionsUseCase(
    userRoles,
    roles,
    rolePermissions,
    permissions,
    dataSource,
    ledger,
  );
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

  it('D3: an Inactive role contributes neither its code nor its permissions', async () => {
    const world = await buildSeededWorld();
    const assign = new AssignRoleToUserUseCase(world.roles, world.userRoles);
    const userId = randomUUID();
    await assign.Execute({ UserId: userId, RoleCode: RoleCode.Operator });

    const before = await world.effective.Execute(userId);
    expect(before.Roles).toEqual([RoleCode.Operator]);
    expect(hasPermission(before, ActionCode.Read, ObjectType.Warehouse)).toBe(true);

    const operatorRole = await world.roles.FindByCode(RoleCode.Operator);
    operatorRole!.Status = RoleStatus.Inactive;
    await world.roles.Update(operatorRole!);

    const after = await world.effective.Execute(userId);
    expect(after.Roles).toEqual([]);
    expect(after.Permissions).toEqual([]);
  });
});
