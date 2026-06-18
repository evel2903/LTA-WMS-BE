import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRuleDefinitionRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public RuleCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public RuleName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public RuleGroupId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  public PrecedenceTier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  public ControlMode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  public Status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public WarehouseTypeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ZoneId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public LocationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public SkuId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public ItemClass?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public OrderType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public CustomerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public SupplierId?: string;

  @IsOptional()
  @IsObject()
  public ConditionJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  public ActionJson?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  public Priority?: number;

  @IsDateString()
  public EffectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  public EffectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  public RequiresReason?: boolean;

  @IsOptional()
  @IsBoolean()
  public RequiresEvidence?: boolean;

  @IsOptional()
  @IsBoolean()
  public AllowOverride?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string;
}
