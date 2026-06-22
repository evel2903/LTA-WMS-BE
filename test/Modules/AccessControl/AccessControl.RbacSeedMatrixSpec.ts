import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import {
  ROLE_CATALOG,
  PERMISSION_CATALOG,
  ROLE_PERMISSION_GRANTS,
} from '@modules/AccessControl/Application/Services/AccessControlCatalog';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
} from '@modules/AccessControl/Test/AccessControlTestDoubles';

const seedFreshRepositories = async () => {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  await SeedAccessControlRbac(roles, permissions, rolePermissions);
  return { roles, permissions, rolePermissions };
};

const V1_REQUIRED_OBJECTS: ObjectType[] = [
  ObjectType.Partner,
  ObjectType.InboundPlan,
  ObjectType.Receipt,
  ObjectType.QcTask,
  ObjectType.PutawayTask,
  ObjectType.InventoryMovement,
  ObjectType.CycleCount,
  ObjectType.ReplenishmentTask,
  ObjectType.OutboundOrder,
  ObjectType.Allocation,
  ObjectType.PickTask,
  ObjectType.Package,
  ObjectType.Shipment,
  ObjectType.Load,
  ObjectType.GoodsIssue,
  ObjectType.MobileTask,
  ObjectType.LabelTemplate,
  ObjectType.PrintJob,
  ObjectType.IntegrationMessage,
  ObjectType.DeadLetterMessage,
  ObjectType.ReconciliationRun,
];

describe('Access control RBAC seed and matrix', () => {
  it('catalog defines exactly the six core V0 roles', () => {
    const codes = ROLE_CATALOG.map((r) => r.Code);
    expect(codes).toHaveLength(6);
    expect(codes).toEqual(
      expect.arrayContaining([
        RoleCode.WmsAdmin,
        RoleCode.WarehouseSupervisor,
        RoleCode.WarehouseCoordinator,
        RoleCode.Operator,
        RoleCode.Qc,
        RoleCode.InventoryAccountant,
      ]),
    );
  });

  it('permission catalog covers all nine standard actions', () => {
    const actions = new Set(PERMISSION_CATALOG.map((p) => p.Action));
    for (const action of Object.values(ActionCode)) {
      expect(actions.has(action)).toBe(true);
    }
  });

  it('every grant references a permission present in the catalog', () => {
    const catalogKeys = new Set(PERMISSION_CATALOG.map((p) => `${p.Action}:${p.ObjectType}`));
    for (const grant of ROLE_PERMISSION_GRANTS) {
      expect(catalogKeys.has(`${grant.Action}:${grant.ObjectType}`)).toBe(true);
    }
  });

  it('seeds six system roles, the full permission catalog and the matrix', async () => {
    const { roles, permissions, rolePermissions } = await seedFreshRepositories();

    const roleList = await roles.List(0, 100);
    expect(roleList.TotalItems).toBe(6);
    expect(roleList.Items.every((role) => role.IsSystem && role.Status === RoleStatus.Active)).toBe(true);

    const permissionList = await permissions.List(0, 1000);
    expect(permissionList.TotalItems).toBe(PERMISSION_CATALOG.length);

    const admin = await roles.FindByCode(RoleCode.WmsAdmin);
    const adminGrants = await rolePermissions.FindByRoleId(admin!.Id);
    const expectedAdminGrants = ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.WmsAdmin).length;
    expect(adminGrants).toHaveLength(expectedAdminGrants);
  });

  it('is idempotent: re-running creates no duplicates and does not throw', async () => {
    const { roles, permissions, rolePermissions } = await seedFreshRepositories();
    await expect(SeedAccessControlRbac(roles, permissions, rolePermissions)).resolves.not.toThrow();

    expect((await roles.List(0, 100)).TotalItems).toBe(6);
    expect((await permissions.List(0, 1000)).TotalItems).toBe(PERMISSION_CATALOG.length);

    const admin = await roles.FindByCode(RoleCode.WmsAdmin);
    const adminGrants = await rolePermissions.FindByRoleId(admin!.Id);
    const expectedAdminGrants = ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.WmsAdmin).length;
    expect(adminGrants).toHaveLength(expectedAdminGrants);
  });

  it('operator gets a strictly smaller grant set than admin', async () => {
    const { roles, rolePermissions } = await seedFreshRepositories();
    const admin = await roles.FindByCode(RoleCode.WmsAdmin);
    const operator = await roles.FindByCode(RoleCode.Operator);

    const adminGrants = await rolePermissions.FindByRoleId(admin!.Id);
    const operatorGrants = await rolePermissions.FindByRoleId(operator!.Id);
    expect(operatorGrants.length).toBeGreaterThan(0);
    expect(operatorGrants.length).toBeLessThan(adminGrants.length);
  });

  it('extends the seed catalog with V1 objects without adding non-standard actions', async () => {
    expect(Object.values(ActionCode)).toHaveLength(9);
    const knownActions = new Set(Object.values(ActionCode));
    expect(PERMISSION_CATALOG.every((permission) => knownActions.has(permission.Action))).toBe(true);

    const catalogObjects = new Set(PERMISSION_CATALOG.map((permission) => permission.ObjectType));
    for (const objectType of V1_REQUIRED_OBJECTS) {
      expect(catalogObjects.has(objectType)).toBe(true);
    }

    const { permissions } = await seedFreshRepositories();
    const seededObjects = new Set((await permissions.List(0, 10000)).Items.map((permission) => permission.ObjectType));
    for (const objectType of V1_REQUIRED_OBJECTS) {
      expect(seededObjects.has(objectType)).toBe(true);
    }
  });
});
