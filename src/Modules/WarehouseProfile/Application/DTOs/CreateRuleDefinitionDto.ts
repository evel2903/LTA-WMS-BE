export class CreateRuleDefinitionDto {
  public RuleCode!: string;
  public RuleName!: string;
  public RuleGroupId!: string;

  public PrecedenceTier!: string;
  public ControlMode!: string;
  public Status?: string;

  public WarehouseTypeCode?: string;
  public WarehouseId?: string;
  public ZoneId?: string;
  public LocationType?: string;
  public OwnerId?: string;
  public SkuId?: string;
  public ItemClass?: string;
  public OrderType?: string;
  public CustomerId?: string;
  public SupplierId?: string;

  public ConditionJson?: unknown;
  public ActionJson?: unknown;
  public Priority?: number;
  public EffectiveFrom!: string;
  public EffectiveTo?: string;
  public RequiresReason?: boolean;
  public RequiresEvidence?: boolean;
  public AllowOverride?: boolean;

  public SourceSystem?: string;
  public ReferenceId?: string;
  public CreatedBy?: string;
}
