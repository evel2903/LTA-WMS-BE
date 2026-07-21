import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('IDX_qc_results_task', ['QcTaskId'])
@Index('IDX_qc_results_receipt', ['ReceiptId'])
@Index('IDX_qc_results_line', ['ReceiptLineId'])
@Index('IDX_qc_results_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Index('UQ_qc_results_idempotency', ['QcTaskId', 'IdempotencyKey'], { unique: true })
@Entity({ name: 'qc_results' })
export class QcResultOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'qc_task_id', type: 'char', length: 36 })
  public QcTaskId!: string;

  @Column({ name: 'receipt_id', type: 'char', length: 36 })
  public ReceiptId!: string;

  @Column({ name: 'receipt_line_id', type: 'char', length: 36 })
  public ReceiptLineId!: string;

  @Column({ name: 'inbound_plan_id', type: 'char', length: 36, nullable: true })
  public InboundPlanId!: string | null;

  @Column({ name: 'inbound_plan_line_id', type: 'char', length: 36, nullable: true })
  public InboundPlanLineId!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'result_status', type: 'varchar', length: 40 })
  public ResultStatus!: string;

  @Column({ name: 'disposition_code', type: 'varchar', length: 40 })
  public DispositionCode!: string;

  @Column({ name: 'inspected_quantity', type: 'numeric', precision: 18, scale: 4 })
  public InspectedQuantity!: number;

  @Column({ name: 'accepted_quantity', type: 'numeric', precision: 18, scale: 4 })
  public AcceptedQuantity!: number;

  @Column({ name: 'rejected_quantity', type: 'numeric', precision: 18, scale: 4 })
  public RejectedQuantity!: number;

  @Column({ name: 'accepted_inventory_status_code', type: 'varchar', length: 80, nullable: true })
  public AcceptedInventoryStatusCode!: string | null;

  @Column({ name: 'rejected_inventory_status_code', type: 'varchar', length: 80, nullable: true })
  public RejectedInventoryStatusCode!: string | null;

  @Column({ name: 'target_inventory_status_code', type: 'varchar', length: 80 })
  public TargetInventoryStatusCode!: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'evidence_json', type: 'jsonb', nullable: true })
  public EvidenceJson!: Record<string, unknown> | null;

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
