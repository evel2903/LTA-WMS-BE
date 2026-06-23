import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';

export class ReleaseReplenishmentTaskRequest {
  @IsEnum(ReplenishmentTriggerType)
  public TriggerType!: ReplenishmentTriggerType;

  @IsString()
  @MaxLength(36)
  public SourceBalanceId!: string;

  @IsString()
  @MaxLength(36)
  public TargetLocationId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  public Quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  public ShortPickReference?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  public Priority?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public WorkPoolCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public AssignedUserId?: string | null;

  @IsString()
  @MaxLength(80)
  public ReasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public ReasonNote?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  public EvidenceRefs?: string[];

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;
}
