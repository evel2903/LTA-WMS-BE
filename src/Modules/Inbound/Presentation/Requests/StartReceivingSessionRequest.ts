import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class StartReceivingSessionRequest {
  @IsOptional()
  @IsString()
  public SessionKey?: string;

  @IsOptional()
  @IsString()
  public DeviceCode?: string;

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
