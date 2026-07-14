import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AssignRoleRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public RoleCode!: string;
}
