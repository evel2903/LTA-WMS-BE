import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { PermissionDto } from '@modules/AccessControl/Application/DTOs/PermissionDto';

export interface RoleDto {
  Id: string;
  RoleCode: string;
  RoleName: string;
  Description: string | null;
  IsSystem: boolean;
  Status: RoleStatus;
  Permissions?: PermissionDto[];
}

export interface CreateRoleDto {
  RoleCode: string;
  RoleName: string;
  Description?: string | null;
  ActorUserId?: string;
}

export interface UpdateRoleDto {
  Id: string;
  RoleName?: string;
  Description?: string | null;
  Status?: RoleStatus;
  ActorUserId?: string;
}
