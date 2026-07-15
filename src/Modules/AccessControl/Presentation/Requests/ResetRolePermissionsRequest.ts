import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Wire shape is lower-camel (contract §4 Signal 3, RATIFIED) -- see SetRolePermissionsRequest.
export class ResetRolePermissionsRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public reasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public reasonNote?: string;

  @IsOptional()
  @IsArray()
  public evidenceRefs?: unknown[];
}
