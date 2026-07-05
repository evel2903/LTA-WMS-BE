import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';

@Index('IDX_putaway_tasks_scope_status', ['WarehouseId', 'OwnerId', 'TaskStatus'])
@Index('IDX_putaway_tasks_target_location', ['TargetLocationId'])
@Index('UQ_putaway_tasks_inbound_release', ['InboundPutawayReleaseId'], { unique: true })
@Index('UQ_putaway_tasks_idempotency', ['InboundPutawayReleaseId', 'IdempotencyKey'], { unique: true })
@Entity({ name: 'putaway_tasks' })
export class PutawayTaskOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'task_code', type: 'varchar', length: 80, unique: true })
  public TaskCode!: string;

  @Column({ name: 'task_status', type: 'varchar', length: 40 })
  public TaskStatus!: PutawayTaskStatus;

  @Column({ name: 'inbound_putaway_release_id', type: 'char', length: 36 })
  public InboundPutawayReleaseId!: string;

  @Column({ name: 'receipt_id', type: 'char', length: 36 })
  public ReceiptId!: string;

  @Column({ name: 'receipt_line_id', type: 'char', length: 36 })
  public ReceiptLineId!: string;

  @Column({ name: 'inbound_plan_id', type: 'char', length: 36 })
  public InboundPlanId!: string;

  @Column({ name: 'inbound_plan_line_id', type: 'char', length: 36 })
  public InboundPlanLineId!: string;

  @Column({ name: 'inbound_lpn_id', type: 'char', length: 36, nullable: true })
  public InboundLpnId!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Column({ name: 'sku_code', type: 'varchar', length: 80, nullable: true })
  public SkuCode!: string | null;

  @Column({ name: 'uom_id', type: 'char', length: 36 })
  public UomId!: string;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 4 })
  public Quantity!: number;

  @Column({ name: 'lpn_code', type: 'varchar', length: 80, nullable: true })
  public LpnCode!: string | null;

  @Column({ name: 'sscc_code', type: 'varchar', length: 40, nullable: true })
  public SsccCode!: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 100, nullable: true })
  public LotNumber!: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  public ExpiryDate!: Date | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  public SerialNumber!: string | null;

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 80 })
  public InventoryStatusCode!: string;

  @Column({ name: 'source_location_id', type: 'char', length: 36, nullable: true })
  public SourceLocationId!: string | null;

  @Column({ name: 'source_location_code', type: 'varchar', length: 80, nullable: true })
  public SourceLocationCode!: string | null;

  @Column({ name: 'target_location_id', type: 'char', length: 36 })
  public TargetLocationId!: string;

  @Column({ name: 'target_location_code', type: 'varchar', length: 80 })
  public TargetLocationCode!: string;

  @Column({ name: 'target_location_profile_id', type: 'char', length: 36, nullable: true })
  public TargetLocationProfileId!: string | null;

  @Column({ name: 'priority', type: 'integer', default: 50 })
  public Priority!: number;

  @Column({ name: 'work_pool_code', type: 'varchar', length: 80, nullable: true })
  public WorkPoolCode!: string | null;

  @Column({ name: 'assigned_user_id', type: 'char', length: 36, nullable: true })
  public AssignedUserId!: string | null;

  @Column({ name: 'constraint_json', type: 'jsonb', nullable: true })
  public ConstraintJson!: Record<string, unknown> | null;

  @Column({ name: 'eligibility_decision_json', type: 'jsonb', nullable: true })
  public EligibilityDecisionJson!: Record<string, unknown> | null;

  @Column({ name: 'outbox_message_id', type: 'char', length: 36, nullable: true })
  public OutboxMessageId!: string | null;

  @Column({ name: 'mobile_task_id', type: 'char', length: 36, nullable: true })
  public MobileTaskId!: string | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  public IdempotencyKey!: string;

  @Column({ name: 'released_at', type: 'timestamptz' })
  public ReleasedAt!: Date;

  @Column({ name: 'released_by', type: 'char', length: 36, nullable: true })
  public ReleasedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
