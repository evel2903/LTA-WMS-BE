import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';

export const ROLE_PERMISSION_REPOSITORY = Symbol('IRolePermissionRepository');

export interface IRolePermissionRepository {
  FindByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermissionEntity | null>;
  FindByRoleId(roleId: string): Promise<RolePermissionEntity[]>;
  FindByRoleIds(roleIds: string[]): Promise<RolePermissionEntity[]>;
  FindByPermissionId(permissionId: string): Promise<RolePermissionEntity[]>;
  Create(rolePermission: RolePermissionEntity): Promise<RolePermissionEntity>;
}
