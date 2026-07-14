import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';

export class UpdateRoleRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public RoleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public Description?: string | null;

  @IsOptional()
  @IsEnum(RoleStatus)
  public Status?: RoleStatus;
}
