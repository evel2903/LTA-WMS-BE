import { randomUUID } from 'crypto';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryDataScopeRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const buildWorld = async () => {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  const userRoles = new InMemoryUserRoleRepository();
  const dataScopes = new InMemoryDataScopeRepository();
  await SeedAccessControlRbac(roles, permissions, rolePermissions);
  const checker = new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes, roles);

  const assign = async (userId: string, code: RoleCode) => {
    const role = await roles.FindByCode(code);
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: userId, RoleId: role!.Id, AssignedAt: new Date() }),
    );
    return role!.Id;
  };
  const grantUserScope = async (userId: string, scopeType: DataScopeType, valueId: string) => {
    const now = new Date();
    await dataScopes.Create(
      new DataScopeEntity({
        Id: randomUUID(),
        PrincipalType: PrincipalType.User,
        PrincipalId: userId,
        ScopeType: scopeType,
        ScopeValueId: valueId,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
  };
  const grantRoleIncludeAll = async (roleId: string, scopeType: DataScopeType) => {
    const now = new Date();
    await dataScopes.Create(
      new DataScopeEntity({
        Id: randomUUID(),
        PrincipalType: PrincipalType.Role,
        PrincipalId: roleId,
        ScopeType: scopeType,
        IncludeAll: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
  };
  return { checker, roles, assign, grantUserScope, grantRoleIncludeAll };
};

describe('PermissionChecker', () => {
  it('denies by default when the user has no roles', async () => {
    const { checker } = await buildWorld();
    const decision = await checker.Check({
      UserId: 'ghost',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
    });
    expect(decision).toEqual({ Allowed: false, Reason: 'PERMISSION_DENIED' });
  });

  it('allows an admin action on a no-scope object', async () => {
    const world = await buildWorld();
    await world.assign('admin', RoleCode.WmsAdmin);
    const decision = await world.checker.Check({
      UserId: 'admin',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Role,
    });
    expect(decision.Allowed).toBe(true);
  });

  it('denies when the role lacks the (action, object) grant', async () => {
    const world = await buildWorld();
    await world.assign('op', RoleCode.Operator);
    const decision = await world.checker.Check({
      UserId: 'op',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Role,
    });
    expect(decision).toEqual({ Allowed: false, Reason: 'PERMISSION_DENIED' });
  });

  it('denies OUT_OF_SCOPE when the user has the permission but no matching data scope', async () => {
    const world = await buildWorld();
    await world.assign('sup', RoleCode.WarehouseSupervisor); // supervisor has Read:Warehouse
    const decision = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
      Scope: { WarehouseId: 'W1' },
    });
    expect(decision).toEqual({ Allowed: false, Reason: 'OUT_OF_SCOPE' });
  });

  it('allows when a user data scope matches the target, denies a different target', async () => {
    const world = await buildWorld();
    await world.assign('sup', RoleCode.WarehouseSupervisor);
    await world.grantUserScope('sup', DataScopeType.Warehouse, 'W1');

    const inScope = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
      Scope: { WarehouseId: 'W1' },
    });
    expect(inScope.Allowed).toBe(true);

    const outScope = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
      Scope: { WarehouseId: 'W2' },
    });
    expect(outScope).toEqual({ Allowed: false, Reason: 'OUT_OF_SCOPE' });
  });

  it('enforces Owner data scope for SKU create when an owner target is supplied', async () => {
    const world = await buildWorld();
    await world.assign('admin', RoleCode.WmsAdmin);

    const outScope = await world.checker.Check({
      UserId: 'admin',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Sku,
      Scope: { OwnerId: 'owner-1' },
    });
    expect(outScope).toEqual({ Allowed: false, Reason: 'OUT_OF_SCOPE' });

    await world.grantUserScope('admin', DataScopeType.Owner, 'owner-1');
    const inScope = await world.checker.Check({
      UserId: 'admin',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Sku,
      Scope: { OwnerId: 'owner-1' },
    });
    expect(inScope.Allowed).toBe(true);
  });

  it('IncludeAll on the role lets any target pass scope', async () => {
    const world = await buildWorld();
    const roleId = await world.assign('sup', RoleCode.WarehouseSupervisor);
    await world.grantRoleIncludeAll(roleId, DataScopeType.Warehouse);
    const decision = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
      Scope: { WarehouseId: 'any-wh' },
    });
    expect(decision.Allowed).toBe(true);
  });

  it('blocks self-approval (Approve on own request) even with the permission', async () => {
    const world = await buildWorld();
    await world.assign('sup', RoleCode.WarehouseSupervisor); // supervisor has Approve:ApprovalRequest
    const selfApprove = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Approve,
      ObjectType: ObjectType.ApprovalRequest,
      Scope: { RequesterUserId: 'sup' },
    });
    expect(selfApprove).toEqual({ Allowed: false, Reason: 'SELF_APPROVAL' });

    const otherApprove = await world.checker.Check({
      UserId: 'sup',
      Action: ActionCode.Approve,
      ObjectType: ObjectType.ApprovalRequest,
      Scope: { RequesterUserId: 'someone-else' },
    });
    expect(otherApprove.Allowed).toBe(true);
  });

  it('D3: denies once the granting role is set Inactive', async () => {
    const world = await buildWorld();
    await world.assign('admin', RoleCode.WmsAdmin);

    const before = await world.checker.Check({
      UserId: 'admin',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Role,
    });
    expect(before.Allowed).toBe(true);

    const adminRole = await world.roles.FindByCode(RoleCode.WmsAdmin);
    adminRole!.Status = RoleStatus.Inactive;
    await world.roles.Update(adminRole!);

    const after = await world.checker.Check({
      UserId: 'admin',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Role,
    });
    expect(after).toEqual({ Allowed: false, Reason: 'PERMISSION_DENIED' });
  });
});
