import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PolicyConfig } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

@Entity({ name: 'warehouse_profiles' })
export class WarehouseProfileOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_warehouse_profiles_profile_code', { unique: true })
  @Column({ name: 'profile_code', type: 'varchar', length: 80 })
  public ProfileCode!: string;

  @Column({ name: 'profile_name', type: 'varchar', length: 255 })
  public ProfileName!: string;

  @Column({ name: 'warehouse_type_code', type: 'varchar', length: 50 })
  public WarehouseTypeCode!: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  public Version!: number;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

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

  @Index('IDX_warehouse_profiles_scope_key')
  @Column({ name: 'scope_key', type: 'varchar', length: 128 })
  public ScopeKey!: string;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  public EffectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  public EffectiveTo!: Date | null;

  @Column({ name: 'capability_flags', type: 'jsonb', default: () => `'{}'::jsonb` })
  public CapabilityFlags!: PolicyConfig;

  @Column({ name: 'strategy_policy', type: 'jsonb', default: () => `'{}'::jsonb` })
  public StrategyPolicy!: PolicyConfig;

  @Column({ name: 'threshold_policy', type: 'jsonb', default: () => `'{}'::jsonb` })
  public ThresholdPolicy!: PolicyConfig;

  @Column({ name: 'approval_policy', type: 'jsonb', default: () => `'{}'::jsonb` })
  public ApprovalPolicy!: PolicyConfig;

  @Column({ name: 'label_device_policy', type: 'jsonb', default: () => `'{}'::jsonb` })
  public LabelDevicePolicy!: PolicyConfig;

  @Column({ name: 'integration_policy', type: 'jsonb', default: () => `'{}'::jsonb` })
  public IntegrationPolicy!: PolicyConfig;

  @Column({ name: 'audit_policy', type: 'jsonb', default: () => `'{}'::jsonb` })
  public AuditPolicy!: PolicyConfig;

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
