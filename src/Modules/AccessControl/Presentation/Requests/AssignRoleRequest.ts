import { IsEnum } from 'class-validator';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';

export class AssignRoleRequest {
  @IsEnum(RoleCode)
  public RoleCode!: RoleCode;
}
