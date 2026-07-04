import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('IDX_qc_tasks_receipt', ['ReceiptId'])
@Index('IDX_qc_tasks_line', ['ReceiptLineId'])
@Index('IDX_qc_tasks_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Index('UQ_qc_tasks_idempotency', ['ReceiptId', 'IdempotencyKey'], { unique: true })
@Entity({ name: 'qc_tasks' })
export class QcTaskOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'receipt_id', type: 'char', length: 36 })
  public ReceiptId!: string;

  @Column({ name: 'receipt_line_id', type: 'char', length: 36 })
  public ReceiptLineId!: string;

  @Column({ name: 'inbound_plan_id', type: 'char', length: 36 })
  public InboundPlanId!: string;

  @Column({ name: 'inbound_plan_line_id', type: 'char', length: 36 })
  public InboundPlanLineId!: string;

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

  @Column({ name: 'actual_quantity', type: 'numeric', precision: 18, scale: 4 })
  public ActualQuantity!: number;

  @Column({ name: 'task_status', type: 'varchar', length: 40 })
  public TaskStatus!: string;

  @Column({ name: 'required', type: 'boolean' })
  public Required!: boolean;

  @Column({ name: 'trigger_reason', type: 'varchar', length: 80 })
  public TriggerReason!: string;

  @Column({ name: 'trigger_policy_json', type: 'jsonb', nullable: true })
  public TriggerPolicyJson!: Record<string, unknown> | null;

  @Column({ name: 'sampling_percent', type: 'numeric', precision: 5, scale: 2, nullable: true })
  public SamplingPercent!: number | null;

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 80 })
  public InventoryStatusCode!: string;

  @Column({ name: 'target_inventory_status_code', type: 'varchar', length: 80, nullable: true })
  public TargetInventoryStatusCode!: string | null;

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

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
