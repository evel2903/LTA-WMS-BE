import { Role as LegacyRole } from '@common/Constants/Role';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { BridgeLegacyUserRoles } from '@modules/AccessControl/Application/Services/LegacyRoleBridge';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import { GetRoleUseCase } from '@modules/AccessControl/Application/UseCases/GetRoleUseCase';
import { ListPermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ListPermissionsUseCase';
import { GetUserEffectivePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/GetUserEffectivePermissionsUseCase';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
} from '@modules/AccessControl/Test/AccessControlTestDoubles';

/**
 * AC5 end-to-end (no DB): seed RBAC -> bridge legacy users -> prove a user has
 * effective roles + permissions, and the read use cases expose the catalog.
 */
describe('RBAC C1 end-to-end fixture', () => {
  it('seeds, bridges legacy users and resolves effective permissions through read use cases', async () => {
    const roles = new InMemoryRoleRepository();
    const permissions = new InMemoryPermissionRepository();
    const rolePermissions = new InMemoryRolePermissionRepository();
    const userRoles = new InMemoryUserRoleRepository();

    await SeedAccessControlRbac(roles, permissions, rolePermissions);
    await BridgeLegacyUserRoles(
      [
        { Id: 'legacy-admin', Role: LegacyRole.Admin },
        { Id: 'legacy-user', Role: LegacyRole.User },
      ],
      roles,
      userRoles,
    );

    // Read use cases (back the C10 FE matrix + C2 enforcement reads).
    const roleList = await new ListRolesUseCase(roles).Execute({});
    expect(roleList.Meta.TotalItems).toBe(6);

    const adminRole = await new GetRoleUseCase(roles, rolePermissions, permissions).Execute(RoleCode.WmsAdmin);
    expect(adminRole.RoleCode).toBe(RoleCode.WmsAdmin);
    expect(adminRole.Permissions?.length ?? 0).toBeGreaterThan(0);

    const readPermissions = await new ListPermissionsUseCase(permissions).Execute({ Action: ActionCode.Read });
    expect(readPermissions.Items.every((p) => p.Action === ActionCode.Read)).toBe(true);

    // Effective permissions for the bridged users.
    const effective = new GetUserEffectivePermissionsUseCase(userRoles, roles, rolePermissions, permissions);

    const admin = await effective.Execute('legacy-admin');
    expect(admin.Roles).toEqual([RoleCode.WmsAdmin]);
    expect(admin.Permissions.some((p) => p.Action === ActionCode.Create && p.ObjectType === ObjectType.Role)).toBe(
      true,
    );

    const operator = await effective.Execute('legacy-user');
    expect(operator.Roles).toEqual([RoleCode.Operator]);
    expect(operator.Permissions.some((p) => p.Action === ActionCode.Create && p.ObjectType === ObjectType.Role)).toBe(
      false,
    );
    expect(operator.Permissions.length).toBeLessThan(admin.Permissions.length);
  });
});
