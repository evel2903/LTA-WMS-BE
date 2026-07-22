import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleRequest {
  // RH-03/RH-CODE-01: length + format are enforced by CanonicalizeRoleCode AFTER trim, so no
  // pre-trim @MaxLength here (it would reject a valid code padded with surrounding whitespace).
  @IsString()
  @IsNotEmpty()
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
