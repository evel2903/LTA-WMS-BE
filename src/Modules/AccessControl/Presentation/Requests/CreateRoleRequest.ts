import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public RoleCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public RoleName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public Description?: string;
}
