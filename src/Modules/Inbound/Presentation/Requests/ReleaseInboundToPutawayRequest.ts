import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleaseInboundToPutawayRequest {
  @IsString()
  @IsOptional()
  public CurrentLocationId?: string | null;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  public CurrentLocationCode?: string | null;

  @IsBoolean()
  @IsOptional()
  public RequireLpn?: boolean;

  @IsBoolean()
  @IsOptional()
  public AttemptLabelOverride?: boolean;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  public ReasonCode?: string | null;

  @IsString()
  @IsOptional()
  public ReasonNote?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public EvidenceRefs?: string[];

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
