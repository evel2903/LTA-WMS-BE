import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PickReleaseOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickReleaseOrmEntity';

@Index('IDX_outbound_pick_tasks_release', ['PickReleaseId'])
@Index('IDX_outbound_pick_tasks_order_status', ['OutboundOrderId', 'Status'])
@Index('IDX_outbound_pick_tasks_source_location', ['SourceLocationId'])
@Entity({ name: 'outbound_pick_tasks' })
export class PickTaskOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'pick_release_id', type: 'char', length: 36 })
  public PickReleaseId!: string;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'allocation_id', type: 'char', length: 36 })
  public AllocationId!: string;

  @Column({ name: 'allocation_line_id', type: 'char', length: 36 })
  public AllocationLineId!: string;

  @Column({ name: 'outbound_order_line_id', type: 'char', length: 36 })
  public OutboundOrderLineId!: string;

  @Column({ name: 'task_number', type: 'varchar', length: 80 })
  public TaskNumber!: string;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'sequence', type: 'integer' })
  public Sequence!: number;

  @Column({ name: 'batch_number', type: 'varchar', length: 80, nullable: true })
  public BatchNumber!: string | null;

  @Column({ name: 'source_balance_id', type: 'char', length: 36 })
  public SourceBalanceId!: string;

  @Column({ name: 'source_dimension_id', type: 'char', length: 36 })
  public SourceDimensionId!: string;

  @Column({ name: 'source_location_id', type: 'char', length: 36 })
  public SourceLocationId!: string;

  @Column({ name: 'target_location_id', type: 'char', length: 36, nullable: true })
  public TargetLocationId!: string | null;

  @Column({ name: 'target_reference', type: 'varchar', length: 180, nullable: true })
  public TargetReference!: string | null;

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

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 50, nullable: true })
  public InventoryStatusCode!: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 100, nullable: true })
  public LotNumber!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  public SerialNumber!: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  public ExpiryDate!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  public CompletedAt!: Date | null;

  @Column({ name: 'completed_by', type: 'char', length: 36, nullable: true })
  public CompletedBy!: string | null;

  @Column({ name: 'confirm_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public ConfirmIdempotencyKey!: string | null;

  @Column({ name: 'confirm_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public ConfirmPayloadFingerprint!: string | null;

  @Column({ name: 'confirm_outbox_message_id', type: 'char', length: 36, nullable: true })
  public ConfirmOutboxMessageId!: string | null;

  @Column({ name: 'confirm_inventory_transaction_id', type: 'char', length: 36, nullable: true })
  public ConfirmInventoryTransactionId!: string | null;

  @Column({ name: 'confirm_result_json', type: 'jsonb', nullable: true })
  public ConfirmResultJson!: Record<string, unknown> | null;

  @Column({ name: 'exception_type', type: 'varchar', length: 40, nullable: true })
  public ExceptionType!: string | null;

  @Column({ name: 'exception_case_id', type: 'char', length: 36, nullable: true })
  public ExceptionCaseId!: string | null;

  @Column({ name: 'exception_reason_code', type: 'varchar', length: 80, nullable: true })
  public ExceptionReasonCode!: string | null;

  @Column({ name: 'exception_reason_code_id', type: 'char', length: 36, nullable: true })
  public ExceptionReasonCodeId!: string | null;

  @Column({ name: 'exception_reason_note', type: 'text', nullable: true })
  public ExceptionReasonNote!: string | null;

  @Column({ name: 'exception_evidence_json', type: 'jsonb', nullable: true })
  public ExceptionEvidenceJson!: Record<string, unknown> | null;

  @Column({ name: 'exception_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public ExceptionIdempotencyKey!: string | null;

  @Column({ name: 'exception_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public ExceptionPayloadFingerprint!: string | null;

  @Column({ name: 'exception_reported_at', type: 'timestamptz', nullable: true })
  public ExceptionReportedAt!: Date | null;

  @Column({ name: 'exception_reported_by', type: 'char', length: 36, nullable: true })
  public ExceptionReportedBy!: string | null;

  @Column({ name: 'replenishment_required', type: 'boolean', default: false })
  public ReplenishmentRequired!: boolean;

  @Column({ name: 'replenishment_task_id', type: 'char', length: 36, nullable: true })
  public ReplenishmentTaskId!: string | null;

  @Column({ name: 'substitution_status', type: 'varchar', length: 40, nullable: true })
  public SubstitutionStatus!: string | null;

  @Column({ name: 'substitution_sku_id', type: 'char', length: 36, nullable: true })
  public SubstitutionSkuId!: string | null;

  @Column({ name: 'substitution_sku_code', type: 'varchar', length: 80, nullable: true })
  public SubstitutionSkuCode!: string | null;

  @Column({ name: 'substitution_uom_id', type: 'char', length: 36, nullable: true })
  public SubstitutionUomId!: string | null;

  @Column({ name: 'substitution_uom_code', type: 'varchar', length: 40, nullable: true })
  public SubstitutionUomCode!: string | null;

  @Column({ name: 'substitution_quantity', type: 'numeric', precision: 18, scale: 4, nullable: true })
  public SubstitutionQuantity!: number | null;

  @Column({ name: 'substitution_approval_request_id', type: 'char', length: 36, nullable: true })
  public SubstitutionApprovalRequestId!: string | null;

  @Column({ name: 'substitution_policy_json', type: 'jsonb', nullable: true })
  public SubstitutionPolicyJson!: Record<string, unknown> | null;

  @Column({ name: 'substitution_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public SubstitutionIdempotencyKey!: string | null;

  @Column({ name: 'substitution_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public SubstitutionPayloadFingerprint!: string | null;

  @Column({ name: 'substitution_requested_at', type: 'timestamptz', nullable: true })
  public SubstitutionRequestedAt!: Date | null;

  @Column({ name: 'substitution_requested_by', type: 'char', length: 36, nullable: true })
  public SubstitutionRequestedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @ManyToOne(() => PickReleaseOrmEntity, (release) => release.Tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pick_release_id' })
  public PickRelease!: PickReleaseOrmEntity;
}
