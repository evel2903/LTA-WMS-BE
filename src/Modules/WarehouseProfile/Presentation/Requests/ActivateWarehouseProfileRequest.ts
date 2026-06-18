import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request body for POST /warehouse-profiles/:id/activate. All fields optional: the profile id comes
 * from the route param. ActorUserId/ReasonCode/ReasonNote are activation context (stored for C5,
 * not validated against a catalog in B5). EffectiveFrom/EffectiveTo optionally override the window.
 */
export class ActivateWarehouseProfileRequest {
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

  @IsOptional()
  @IsDateString()
  public EffectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  public EffectiveTo?: string | null;
}
