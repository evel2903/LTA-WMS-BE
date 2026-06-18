import { IsDateString, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

/**
 * PATCH OMIT contract: absent property = "no change". Business-required fields must not be
 * sent as null; the use case rejects an explicit null for ProfileCode/ProfileName/
 * WarehouseTypeCode/EffectiveFrom with a BusinessRuleException. Scope axes accept null (clear).
 */
export class UpdateWarehouseProfileRequest {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  public ProfileCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public ProfileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public WarehouseTypeCode?: string;

  @IsOptional()
  @IsDateString()
  public EffectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  public EffectiveTo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ZoneId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public LocationType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public SkuId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public ItemClass?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public OrderType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public CustomerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public SupplierId?: string | null;

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
  public SourceSystem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string | null;
}
