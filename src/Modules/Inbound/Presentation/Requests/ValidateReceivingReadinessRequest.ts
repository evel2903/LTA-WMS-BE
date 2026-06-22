import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ValidateReceivingReadinessRequest {
  @IsOptional()
  @IsBoolean()
  public AttemptOverride?: boolean;

  @IsOptional()
  @IsString()
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public EvidenceRefs?: string[];
}
