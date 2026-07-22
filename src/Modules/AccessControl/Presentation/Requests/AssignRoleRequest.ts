import { IsNotEmpty, IsString } from 'class-validator';

export class AssignRoleRequest {
  // RH-03/RH-CODE-01: length + format are enforced by CanonicalizeRoleCode AFTER trim, so no
  // pre-trim @MaxLength here (it would reject a valid code padded with surrounding whitespace).
  @IsString()
  @IsNotEmpty()
  public RoleCode!: string;
}
