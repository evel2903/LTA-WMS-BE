import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request body for POST /warehouse-profiles/:id/deactivate. All fields optional: the profile id
 * comes from the route param. ActorUserId/ReasonCode/ReasonNote are deactivation context (stored
 * for C5, not validated against a catalog in B5).
 */
export class DeactivateWarehouseProfileRequest {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ActorUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public ReasonNote?: string;
}
