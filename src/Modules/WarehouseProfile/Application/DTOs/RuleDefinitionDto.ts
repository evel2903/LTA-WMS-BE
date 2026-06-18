import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleAction, RuleCondition } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';

export class RuleDefinitionDto {
  public Id!: string;
  public RuleCode!: string;
  public RuleName!: string;
  public RuleGroupId!: string;

  public PrecedenceTier!: RulePrecedenceTier;
  public ControlMode!: RuleControlMode;
  public Status!: RuleStatus;

  public WarehouseTypeCode!: string | null;
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

  public ConditionJson!: RuleCondition;
  public ActionJson!: RuleAction;
  public Priority!: number;
  public EffectiveFrom!: string;
  public EffectiveTo!: string | null;
  public RequiresReason!: boolean;
  public RequiresEvidence!: boolean;
  public AllowOverride!: boolean;

  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
