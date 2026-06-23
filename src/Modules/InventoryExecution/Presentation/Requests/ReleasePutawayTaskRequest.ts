import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ReleasePutawayTaskRequest {
  @IsString()
  @MaxLength(36)
  public InboundPutawayReleaseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public SourceLocationId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public SourceLocationCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public TargetLocationId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public WorkPoolCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public AssignedUserId?: string | null;

  @IsOptional()
  @IsBoolean()
  public AttemptOverride?: boolean;

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

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
