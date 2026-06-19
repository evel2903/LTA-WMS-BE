import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';

export interface AssignRoleDto {
  UserId: string;
  RoleCode: RoleCode;
  AssignedBy?: string | null;
}
