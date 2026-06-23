import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('IDX_inbound_lpns_receipt', ['ReceiptId'])
@Index('IDX_inbound_lpns_line', ['ReceiptLineId'])
@Index('IDX_inbound_lpns_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Index('UQ_inbound_lpns_scope_lpn', ['WarehouseId', 'OwnerId', 'LpnCode'], { unique: true })
@Index('UQ_inbound_lpns_idempotency', ['ReceiptLineId', 'IdempotencyKey'], { unique: true })
@Entity({ name: 'inbound_lpns' })
export class InboundLpnOrmEntity {
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

  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 4 })
  public Quantity!: number;

  @Column({ name: 'lpn_code', type: 'varchar', length: 80 })
  public LpnCode!: string;

  @Column({ name: 'sscc_code', type: 'varchar', length: 40, nullable: true })
  public SsccCode!: string | null;

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

  @Column({ name: 'confirmed_at', type: 'timestamptz' })
  public ConfirmedAt!: Date;

  @Column({ name: 'confirmed_by', type: 'char', length: 36, nullable: true })
  public ConfirmedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
