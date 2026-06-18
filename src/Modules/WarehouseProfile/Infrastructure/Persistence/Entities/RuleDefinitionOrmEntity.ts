import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { RuleAction, RuleCondition } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';

@Entity({ name: 'rule_definitions' })
export class RuleDefinitionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_rule_definitions_rule_code', { unique: true })
  @Column({ name: 'rule_code', type: 'varchar', length: 80 })
  public RuleCode!: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 255 })
  public RuleName!: string;

  @Index('IDX_rule_definitions_rule_group_id')
  @Column({ name: 'rule_group_id', type: 'char', length: 36 })
  public RuleGroupId!: string;

  @Column({ name: 'precedence_tier', type: 'varchar', length: 30 })
  public PrecedenceTier!: string;

  @Column({ name: 'control_mode', type: 'varchar', length: 30 })
  public ControlMode!: string;

  @Column({ name: 'warehouse_type_code', type: 'varchar', length: 50, nullable: true })
  public WarehouseTypeCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36, nullable: true })
  public WarehouseId!: string | null;

  @Column({ name: 'zone_id', type: 'char', length: 36, nullable: true })
  public ZoneId!: string | null;

  @Column({ name: 'location_type', type: 'varchar', length: 50, nullable: true })
  public LocationType!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'sku_id', type: 'char', length: 36, nullable: true })
  public SkuId!: string | null;

  @Column({ name: 'item_class', type: 'varchar', length: 50, nullable: true })
  public ItemClass!: string | null;

  @Column({ name: 'order_type', type: 'varchar', length: 50, nullable: true })
  public OrderType!: string | null;

  @Column({ name: 'customer_id', type: 'char', length: 36, nullable: true })
  public CustomerId!: string | null;

  @Column({ name: 'supplier_id', type: 'char', length: 36, nullable: true })
  public SupplierId!: string | null;

  @Index('IDX_rule_definitions_scope_key')
  @Column({ name: 'scope_key', type: 'varchar', length: 128 })
  public ScopeKey!: string;

  @Column({ name: 'condition_json', type: 'jsonb', default: () => `'{}'::jsonb` })
  public ConditionJson!: RuleCondition;

  @Column({ name: 'action_json', type: 'jsonb', default: () => `'{}'::jsonb` })
  public ActionJson!: RuleAction;

  @Column({ name: 'priority', type: 'integer', default: 100 })
  public Priority!: number;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  public EffectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  public EffectiveTo!: Date | null;

  @Column({ name: 'requires_reason', type: 'boolean', default: false })
  public RequiresReason!: boolean;

  @Column({ name: 'requires_evidence', type: 'boolean', default: false })
  public RequiresEvidence!: boolean;

  @Column({ name: 'allow_override', type: 'boolean', default: false })
  public AllowOverride!: boolean;

  @Column({ name: 'source_system', type: 'varchar', length: 100, nullable: true })
  public SourceSystem!: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 100, nullable: true })
  public ReferenceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
