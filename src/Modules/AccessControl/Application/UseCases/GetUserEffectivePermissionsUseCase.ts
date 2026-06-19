import { EffectivePermissionsDto } from '@modules/AccessControl/Application/DTOs/EffectivePermissionsDto';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';

/**
 * Resolves a user's effective permissions: the union of permissions across every
 * role the user holds (user_roles → role_permissions → permissions). Returns an
 * empty set for a user with no roles — deny by default is the caller's job (C2).
 */
export class GetUserEffectivePermissionsUseCase {
  constructor(
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  public async Execute(userId: string): Promise<EffectivePermissionsDto> {
    const userRoles = await this.userRoleRepository.FindByUserId(userId);
    const roleIds = userRoles.map((ur) => ur.RoleId);

    const roles = await this.roleRepository.FindByIds(roleIds);
    const rolePermissions = await this.rolePermissionRepository.FindByRoleIds(roleIds);
    const permissionIds = [...new Set(rolePermissions.map((rp) => rp.PermissionId))];
    const permissions = await this.permissionRepository.FindByIds(permissionIds);

    return {
      UserId: userId,
      Roles: roles.map((role) => role.RoleCode),
      Permissions: permissions.map((permission) => ({
        Action: permission.Action,
        ObjectType: permission.ObjectType,
        PermissionCode: permission.PermissionCode,
      })),
    };
  }
}
