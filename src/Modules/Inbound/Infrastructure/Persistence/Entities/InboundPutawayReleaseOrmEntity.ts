import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('IDX_inbound_putaway_releases_receipt', ['ReceiptId'])
@Index('IDX_inbound_putaway_releases_line', ['ReceiptLineId'])
@Index('IDX_inbound_putaway_releases_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Index('UQ_inbound_putaway_releases_idempotency', ['ReceiptLineId', 'IdempotencyKey'], { unique: true })
@Entity({ name: 'inbound_putaway_releases' })
export class InboundPutawayReleaseOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'inbound_lpn_id', type: 'char', length: 36, nullable: true })
  public InboundLpnId!: string | null;

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

  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 4 })
  public Quantity!: number;

  @Column({ name: 'lpn_code', type: 'varchar', length: 80, nullable: true })
  public LpnCode!: string | null;

  @Column({ name: 'sscc_code', type: 'varchar', length: 40, nullable: true })
  public SsccCode!: string | null;

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 80 })
  public InventoryStatusCode!: string;

  @Column({ name: 'current_location_id', type: 'char', length: 36, nullable: true })
  public CurrentLocationId!: string | null;

  @Column({ name: 'current_location_code', type: 'varchar', length: 80, nullable: true })
  public CurrentLocationCode!: string | null;

  @Column({ name: 'warehouse_profile_id', type: 'char', length: 36, nullable: true })
  public WarehouseProfileId!: string | null;

  @Column({ name: 'label_decision', type: 'varchar', length: 40, nullable: true })
  public LabelDecision!: string | null;

  @Column({ name: 'label_reason', type: 'text', nullable: true })
  public LabelReason!: string | null;

  @Column({ name: 'matched_print_job_id', type: 'char', length: 36, nullable: true })
  public MatchedPrintJobId!: string | null;

  @Column({ name: 'constraint_json', type: 'jsonb', nullable: true })
  public ConstraintJson!: Record<string, unknown> | null;

  @Column({ name: 'outbox_message_id', type: 'char', length: 36, nullable: true })
  public OutboxMessageId!: string | null;

  @Column({ name: 'core_flow_milestone_id', type: 'char', length: 36, nullable: true })
  public CoreFlowMilestoneId!: string | null;

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
