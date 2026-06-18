import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

export class CreateWarehouseProfileDto {
  public ProfileCode!: string;
  public ProfileName!: string;
  public WarehouseTypeCode!: string;
  public EffectiveFrom!: string;
  public EffectiveTo?: string;

  public WarehouseId?: string;
  public ZoneId?: string;
  public LocationType?: string;
  public OwnerId?: string;
  public SkuId?: string;
  public ItemClass?: string;
  public OrderType?: string;
  public CustomerId?: string;
  public SupplierId?: string;

  public CapabilityFlags?: PolicyConfig;
  public StrategyPolicy?: PolicyConfig;
  public ThresholdPolicy?: PolicyConfig;
  public ApprovalPolicy?: PolicyConfig;
  public LabelDevicePolicy?: PolicyConfig;
  public IntegrationPolicy?: PolicyConfig;
  public AuditPolicy?: PolicyConfig;

  public SourceSystem?: string;
  public ReferenceId?: string;
  public CreatedBy?: string;
}
