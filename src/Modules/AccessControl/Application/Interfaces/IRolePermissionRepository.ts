import { EntityManager } from 'typeorm';
import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';

export const ROLE_PERMISSION_REPOSITORY = Symbol('IRolePermissionRepository');

export interface IRolePermissionRepository {
  FindByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermissionEntity | null>;
  FindByRoleId(roleId: string, manager?: EntityManager): Promise<RolePermissionEntity[]>;
  FindByRoleIds(roleIds: string[]): Promise<RolePermissionEntity[]>;
  FindByPermissionId(permissionId: string): Promise<RolePermissionEntity[]>;
  Create(rolePermission: RolePermissionEntity, manager?: EntityManager): Promise<RolePermissionEntity>;
  Delete(id: string, manager?: EntityManager): Promise<void>;
}
