import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';

export interface UserRoleDto {
  Id: string;
  UserId: string;
  RoleId: string;
  RoleCode: RoleCode;
  Source: UserRoleSource;
  AssignedAt: string;
}
