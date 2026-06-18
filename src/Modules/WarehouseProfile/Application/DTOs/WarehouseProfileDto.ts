import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

export class WarehouseProfileDto {
  public Id!: string;
  public ProfileCode!: string;
  public ProfileName!: string;
  public WarehouseTypeCode!: string;
  public Version!: number;
  public Status!: WarehouseProfileStatus;

  public WarehouseId!: string | null;
  public ZoneId!: string | null;
  public LocationType!: string | null;
  public OwnerId!: string | null;
  public SkuId!: string | null;
  public ItemClass!: string | null;
  public OrderType!: string | null;
  public CustomerId!: string | null;
  public SupplierId!: string | null;
  public ScopeKey!: string;

  public EffectiveFrom!: string;
  public EffectiveTo!: string | null;

  public CapabilityFlags!: PolicyConfig;
  public StrategyPolicy!: PolicyConfig;
  public ThresholdPolicy!: PolicyConfig;
  public ApprovalPolicy!: PolicyConfig;
  public LabelDevicePolicy!: PolicyConfig;
  public IntegrationPolicy!: PolicyConfig;
  public AuditPolicy!: PolicyConfig;

  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
