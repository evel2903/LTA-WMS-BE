import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';

export interface UserRoleDto {
  Id: string;
  UserId: string;
  RoleId: string;
  RoleCode: string;
  Source: UserRoleSource;
  AssignedAt: string;
}
