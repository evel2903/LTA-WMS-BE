import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ReceiptOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptOrmEntity';

@Index('IDX_receipt_lines_receipt', ['ReceiptId'])
@Index('IDX_receipt_lines_plan_line', ['InboundPlanLineId'])
@Index('UQ_receipt_lines_idempotency', ['ReceiptId', 'IdempotencyKey'], { unique: true })
@Entity({ name: 'receipt_lines' })
export class ReceiptLineOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'receipt_id', type: 'char', length: 36 })
  public ReceiptId!: string;

  @Column({ name: 'inbound_plan_id', type: 'char', length: 36 })
  public InboundPlanId!: string;

  @Column({ name: 'inbound_plan_line_id', type: 'char', length: 36 })
  public InboundPlanLineId!: string;

  @Column({ name: 'line_number', type: 'integer' })
  public LineNumber!: number;

  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Column({ name: 'sku_code', type: 'varchar', length: 80, nullable: true })
  public SkuCode!: string | null;

  @Column({ name: 'uom_id', type: 'char', length: 36 })
  public UomId!: string;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'expected_quantity', type: 'numeric', precision: 18, scale: 4 })
  public ExpectedQuantity!: number;

  @Column({ name: 'actual_quantity', type: 'numeric', precision: 18, scale: 4 })
  public ActualQuantity!: number;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'manual_confirm', type: 'boolean', default: false })
  public ManualConfirm!: boolean;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'scan_evidence_json', type: 'jsonb', nullable: true })
  public ScanEvidenceJson!: Record<string, unknown> | null;

  @Column({ name: 'discrepancy_signals', type: 'jsonb', default: () => `'[]'::jsonb` })
  public DiscrepancySignals!: string[];

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  public IdempotencyKey!: string;

  @Column({ name: 'received_at', type: 'timestamptz' })
  public ReceivedAt!: Date;

  @Column({ name: 'received_by', type: 'char', length: 36, nullable: true })
  public ReceivedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @ManyToOne(() => ReceiptOrmEntity, (receipt) => receipt.Lines, { onDelete: 'CASCADE' })
  public Receipt!: ReceiptOrmEntity;
}
