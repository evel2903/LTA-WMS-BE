import { Role as LegacyRole } from '@common/Constants/Role';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { MapLegacyRole, BridgeLegacyUserRoles } from '@modules/AccessControl/Application/Services/LegacyRoleBridge';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import {
  InMemoryRoleRepository,
  InMemoryRoleCatalogRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const seedRoles = async () => {
  const roles = new InMemoryRoleRepository();
  await SeedAccessControlRbac(
    roles,
    new InMemoryPermissionRepository(),
    new InMemoryRolePermissionRepository(),
    new InMemoryRoleCatalogRepository(roles),
  );
  return roles;
};

describe('Legacy role bridge', () => {
  it('maps Admin -> WMS_ADMIN and User -> OPERATOR', () => {
    expect(MapLegacyRole(LegacyRole.Admin)).toBe(RoleCode.WmsAdmin);
    expect(MapLegacyRole(LegacyRole.User)).toBe(RoleCode.Operator);
  });

  it('falls back to OPERATOR for unknown legacy values (least privilege)', () => {
    expect(MapLegacyRole('SOMETHING_ELSE')).toBe(RoleCode.Operator);
  });

  it('creates a user_roles row per legacy user with source LEGACY_BRIDGE', async () => {
    const roles = await seedRoles();
    const userRoles = new InMemoryUserRoleRepository();

    const created = await BridgeLegacyUserRoles(
      [
        { Id: 'user-admin', Role: LegacyRole.Admin },
        { Id: 'user-plain', Role: LegacyRole.User },
      ],
      roles,
      userRoles,
    );
    expect(created).toBe(2);

    const adminRole = await roles.FindByCode(RoleCode.WmsAdmin);
    const operatorRole = await roles.FindByCode(RoleCode.Operator);
    const adminAssignment = await userRoles.FindByUserAndRole('user-admin', adminRole!.Id);
    const plainAssignment = await userRoles.FindByUserAndRole('user-plain', operatorRole!.Id);

    expect(adminAssignment?.Source).toBe(UserRoleSource.LegacyBridge);
    expect(plainAssignment?.Source).toBe(UserRoleSource.LegacyBridge);
  });

  it('is idempotent: re-running bridges nothing new and never loses a user', async () => {
    const roles = await seedRoles();
    const userRoles = new InMemoryUserRoleRepository();
    const users = [
      { Id: 'user-admin', Role: LegacyRole.Admin },
      { Id: 'user-plain', Role: LegacyRole.User },
    ];

    await BridgeLegacyUserRoles(users, roles, userRoles);
    const secondRun = await BridgeLegacyUserRoles(users, roles, userRoles);

    expect(secondRun).toBe(0);
    expect(await userRoles.FindByUserId('user-admin')).toHaveLength(1);
    expect(await userRoles.FindByUserId('user-plain')).toHaveLength(1);
  });

  it('skips users when their target role is not seeded yet', async () => {
    const roles = new InMemoryRoleRepository(); // intentionally NOT seeded
    const userRoles = new InMemoryUserRoleRepository();

    const created = await BridgeLegacyUserRoles([{ Id: 'user-admin', Role: LegacyRole.Admin }], roles, userRoles);
    expect(created).toBe(0);
    expect(await userRoles.FindByUserId('user-admin')).toHaveLength(0);
  });
});
