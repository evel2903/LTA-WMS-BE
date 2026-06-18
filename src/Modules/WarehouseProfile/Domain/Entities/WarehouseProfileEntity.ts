import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

export class WarehouseProfileEntity {
  public readonly Id: string;
  public ProfileCode: string;
  public ProfileName: string;
  public WarehouseTypeCode: string;
  public Version: number;
  public Status: WarehouseProfileStatus;

  public WarehouseId: string | null;
  public ZoneId: string | null;
  public LocationType: string | null;
  public OwnerId: string | null;
  public SkuId: string | null;
  public ItemClass: string | null;
  public OrderType: string | null;
  public CustomerId: string | null;
  public SupplierId: string | null;
  public ScopeKey: string;

  public EffectiveFrom: Date;
  public EffectiveTo: Date | null;

  public CapabilityFlags: PolicyConfig;
  public StrategyPolicy: PolicyConfig;
  public ThresholdPolicy: PolicyConfig;
  public ApprovalPolicy: PolicyConfig;
  public LabelDevicePolicy: PolicyConfig;
  public IntegrationPolicy: PolicyConfig;
  public AuditPolicy: PolicyConfig;

  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    ProfileCode: string;
    ProfileName: string;
    WarehouseTypeCode: string;
    Version: number;
    Status: WarehouseProfileStatus;
    WarehouseId?: string | null;
    ZoneId?: string | null;
    LocationType?: string | null;
    OwnerId?: string | null;
    SkuId?: string | null;
    ItemClass?: string | null;
    OrderType?: string | null;
    CustomerId?: string | null;
    SupplierId?: string | null;
    ScopeKey: string;
    EffectiveFrom: Date;
    EffectiveTo?: Date | null;
    CapabilityFlags?: PolicyConfig;
    StrategyPolicy?: PolicyConfig;
    ThresholdPolicy?: PolicyConfig;
    ApprovalPolicy?: PolicyConfig;
    LabelDevicePolicy?: PolicyConfig;
    IntegrationPolicy?: PolicyConfig;
    AuditPolicy?: PolicyConfig;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.ProfileCode = params.ProfileCode;
    this.ProfileName = params.ProfileName;
    this.WarehouseTypeCode = params.WarehouseTypeCode;
    this.Version = params.Version;
    this.Status = params.Status;
    this.WarehouseId = params.WarehouseId ?? null;
    this.ZoneId = params.ZoneId ?? null;
    this.LocationType = params.LocationType ?? null;
    this.OwnerId = params.OwnerId ?? null;
    this.SkuId = params.SkuId ?? null;
    this.ItemClass = params.ItemClass ?? null;
    this.OrderType = params.OrderType ?? null;
    this.CustomerId = params.CustomerId ?? null;
    this.SupplierId = params.SupplierId ?? null;
    this.ScopeKey = params.ScopeKey;
    this.EffectiveFrom = params.EffectiveFrom;
    this.EffectiveTo = params.EffectiveTo ?? null;
    this.CapabilityFlags = params.CapabilityFlags ?? {};
    this.StrategyPolicy = params.StrategyPolicy ?? {};
    this.ThresholdPolicy = params.ThresholdPolicy ?? {};
    this.ApprovalPolicy = params.ApprovalPolicy ?? {};
    this.LabelDevicePolicy = params.LabelDevicePolicy ?? {};
    this.IntegrationPolicy = params.IntegrationPolicy ?? {};
    this.AuditPolicy = params.AuditPolicy ?? {};
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
