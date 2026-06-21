import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

/**
 * PATCH semantics: a property that is `undefined` / absent means "do not change".
 * Business-required fields (ProfileCode, ProfileName, WarehouseTypeCode, EffectiveFrom)
 * must not be set to `null` — the use case rejects an explicit null for them.
 */
export class UpdateWarehouseProfileDto {
  public Id!: string;
  public ProfileCode?: string;
  public ProfileName?: string;
  public WarehouseTypeCode?: string;
  public EffectiveFrom?: string;
  public EffectiveTo?: string | null;

  public WarehouseId?: string | null;
  public ZoneId?: string | null;
  public LocationType?: string | null;
  public OwnerId?: string | null;
  public SkuId?: string | null;
  public ItemClass?: string | null;
  public OrderType?: string | null;
  public CustomerId?: string | null;
  public SupplierId?: string | null;

  public CapabilityFlags?: PolicyConfig;
  public StrategyPolicy?: PolicyConfig;
  public ThresholdPolicy?: PolicyConfig;
  public ApprovalPolicy?: PolicyConfig;
  public LabelDevicePolicy?: PolicyConfig;
  public IntegrationPolicy?: PolicyConfig;
  public AuditPolicy?: PolicyConfig;

  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  public UpdatedBy?: string;
  public ActorUserId?: string;
}
