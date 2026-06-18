import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleAction, RuleCondition } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';

export class RuleDefinitionEntity {
  public readonly Id: string;
  public RuleCode: string;
  public RuleName: string;
  public RuleGroupId: string;

  public PrecedenceTier: RulePrecedenceTier;
  public ControlMode: RuleControlMode;

  public WarehouseTypeCode: string | null;
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

  public ConditionJson: RuleCondition;
  public ActionJson: RuleAction;
  public Priority: number;
  public Status: RuleStatus;
  public EffectiveFrom: Date;
  public EffectiveTo: Date | null;
  public RequiresReason: boolean;
  public RequiresEvidence: boolean;
  public AllowOverride: boolean;

  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    RuleCode: string;
    RuleName: string;
    RuleGroupId: string;
    PrecedenceTier: RulePrecedenceTier;
    ControlMode: RuleControlMode;
    WarehouseTypeCode?: string | null;
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
    ConditionJson?: RuleCondition;
    ActionJson?: RuleAction;
    Priority?: number;
    Status: RuleStatus;
    EffectiveFrom: Date;
    EffectiveTo?: Date | null;
    RequiresReason?: boolean;
    RequiresEvidence?: boolean;
    AllowOverride?: boolean;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.RuleCode = params.RuleCode;
    this.RuleName = params.RuleName;
    this.RuleGroupId = params.RuleGroupId;
    this.PrecedenceTier = params.PrecedenceTier;
    this.ControlMode = params.ControlMode;
    this.WarehouseTypeCode = params.WarehouseTypeCode ?? null;
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
    this.ConditionJson = params.ConditionJson ?? {};
    this.ActionJson = params.ActionJson ?? {};
    this.Priority = params.Priority ?? 100;
    this.Status = params.Status;
    this.EffectiveFrom = params.EffectiveFrom;
    this.EffectiveTo = params.EffectiveTo ?? null;
    this.RequiresReason = params.RequiresReason ?? false;
    this.RequiresEvidence = params.RequiresEvidence ?? false;
    this.AllowOverride = params.AllowOverride ?? false;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
