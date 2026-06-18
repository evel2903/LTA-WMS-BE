import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

export class CreateWarehouseProfileRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public ProfileCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public ProfileName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public WarehouseTypeCode!: string;

  @IsDateString()
  public EffectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  public EffectiveTo?: string;

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
  public CapabilityFlags?: PolicyConfig;

  @IsOptional()
  @IsObject()
  public StrategyPolicy?: PolicyConfig;

  @IsOptional()
  @IsObject()
  public ThresholdPolicy?: PolicyConfig;

  @IsOptional()
  @IsObject()
  public ApprovalPolicy?: PolicyConfig;

  @IsOptional()
  @IsObject()
  public LabelDevicePolicy?: PolicyConfig;

  @IsOptional()
  @IsObject()
  public IntegrationPolicy?: PolicyConfig;

  @IsOptional()
  @IsObject()
  public AuditPolicy?: PolicyConfig;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string;
}
