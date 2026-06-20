import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for POST /exceptions/:id/assign. */
export class AssignExceptionRequest {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  public AssignedToUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public AssignedRoleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string;
}
