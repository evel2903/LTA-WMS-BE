import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PickReleaseMode } from '@modules/Outbound/Domain/Enums/PickReleaseMode';

export class ReleaseOutboundOrderRequest {
  @IsOptional()
  @IsEnum(PickReleaseMode)
  public ReleaseMode?: PickReleaseMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  public BatchSize?: number;

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

  @IsString()
  public IdempotencyKey!: string;
}
