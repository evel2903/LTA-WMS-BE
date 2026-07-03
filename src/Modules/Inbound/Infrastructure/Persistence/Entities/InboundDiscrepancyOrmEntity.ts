import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('IDX_inbound_discrepancies_receipt', ['ReceiptId'])
@Index('IDX_inbound_discrepancies_line', ['ReceiptLineId'])
@Index('IDX_inbound_discrepancies_exception', ['ExceptionCaseId'])
@Index('IDX_inbound_discrepancies_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Index('UQ_inbound_discrepancies_idempotency', ['ReceiptId', 'IdempotencyKey'], { unique: true })
@Entity({ name: 'inbound_discrepancies' })
export class InboundDiscrepancyOrmEntity {
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

  @Column({ name: 'discrepancy_type', type: 'varchar', length: 60 })
  public DiscrepancyType!: string;

  @Column({ name: 'signals', type: 'jsonb', default: () => `'[]'::jsonb` })
  public Signals!: string[];

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'severity', type: 'varchar', length: 20 })
  public Severity!: string;

  @Column({ name: 'tolerance_decision', type: 'varchar', length: 60 })
  public ToleranceDecision!: string;

  @Column({ name: 'expected_quantity', type: 'numeric', precision: 18, scale: 4 })
  public ExpectedQuantity!: number;

  @Column({ name: 'actual_quantity', type: 'numeric', precision: 18, scale: 4 })
  public ActualQuantity!: number;

  @Column({ name: 'reason_code', type: 'varchar', length: 80 })
  public ReasonCode!: string;

  @Column({ name: 'reason_code_id', type: 'char', length: 36 })
  public ReasonCodeId!: string;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'evidence_json', type: 'jsonb', nullable: true })
  public EvidenceJson!: Record<string, unknown> | null;

  @Column({ name: 'rule_code', type: 'varchar', length: 80, nullable: true })
  public RuleCode!: string | null;

  @Column({ name: 'exception_case_id', type: 'char', length: 36 })
  public ExceptionCaseId!: string;

  @Column({ name: 'exception_state', type: 'varchar', length: 60 })
  public ExceptionState!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  public IdempotencyKey!: string;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  public RecordedAt!: Date;

  @Column({ name: 'recorded_by', type: 'char', length: 36, nullable: true })
  public RecordedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
