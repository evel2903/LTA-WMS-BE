import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { PermissionDto } from '@modules/AccessControl/Application/DTOs/PermissionDto';

export interface RoleDto {
  Id: string;
  RoleCode: RoleCode;
  RoleName: string;
  Description: string | null;
  IsSystem: boolean;
  Status: RoleStatus;
  Permissions?: PermissionDto[];
}
