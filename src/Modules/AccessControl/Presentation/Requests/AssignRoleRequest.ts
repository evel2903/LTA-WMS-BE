import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignRoleRequest {
  // RH-03/RH-CODE-01: length + format are enforced by CanonicalizeRoleCode AFTER trim, so no
  // pre-trim @MaxLength here (it would reject a valid code padded with surrounding whitespace).
  @IsString()
  @IsNotEmpty()
  public RoleCode!: string;

  // RH-04 dual-protocol: when both are present the request applies a registered intent ticket;
  // when absent the compatibility adapter auto-registers a synthetic RunId. Version format is
  // validated in the use case (canonical decimal string / BigInt).
  @IsOptional()
  @IsString()
  public RunId?: string;

  @IsOptional()
  @IsString()
  public IntentVersion?: string;
}
