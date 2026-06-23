import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ConfirmPutawayTaskRequest {
  @IsString()
  @MaxLength(120)
  public SourceLocationScan!: string;

  @IsString()
  @MaxLength(120)
  public TargetLocationScan!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public LpnScan?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  public ConfirmedQuantity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public ReasonCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  public EvidenceRefs?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public DeviceCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public SessionId?: string | null;

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
