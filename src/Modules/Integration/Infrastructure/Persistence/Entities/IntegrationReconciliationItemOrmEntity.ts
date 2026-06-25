import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { IntegrationReconciliationItemStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationItemStatus';
import { IntegrationReconciliationSeverity } from '@modules/Integration/Domain/Enums/IntegrationReconciliationSeverity';

@Entity('integration_reconciliation_items')
@Index('ix_integration_reconciliation_items_run_status', ['RunId', 'ItemStatus'])
export class IntegrationReconciliationItemOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'run_id', type: 'char', length: 36 })
  public RunId!: string;

  @Column({ name: 'item_status', type: 'varchar', length: 40 })
  public ItemStatus!: IntegrationReconciliationItemStatus;

  @Column({ name: 'severity', type: 'varchar', length: 20 })
  public Severity!: IntegrationReconciliationSeverity;

  @Column({ name: 'mismatch_type', type: 'varchar', length: 80 })
  public MismatchType!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 80 })
  public SourceType!: string;

  @Column({ name: 'source_id', type: 'varchar', length: 160, nullable: true })
  public SourceId!: string | null;

  @Column({ name: 'expected_summary', type: 'jsonb', nullable: true })
  public ExpectedSummary!: Record<string, unknown> | null;

  @Column({ name: 'actual_summary', type: 'jsonb', nullable: true })
  public ActualSummary!: Record<string, unknown> | null;

  @Column({ name: 'exception_case_id', type: 'char', length: 36, nullable: true })
  public ExceptionCaseId!: string | null;

  @Column({ name: 'outbox_message_id', type: 'char', length: 36, nullable: true })
  public OutboxMessageId!: string | null;

  @Column({ name: 'dead_letter_message_id', type: 'char', length: 36, nullable: true })
  public DeadLetterMessageId!: string | null;

  @Column({ name: 'resolution_note', type: 'varchar', length: 500, nullable: true })
  public ResolutionNote!: string | null;

  @Column({ name: 'resolution_idempotency_key', type: 'varchar', length: 160, nullable: true })
  public ResolutionIdempotencyKey!: string | null;

  @Column({ name: 'resolution_payload_hash', type: 'varchar', length: 64, nullable: true })
  public ResolutionPayloadHash!: string | null;

  @Column({ name: 'approval_request_id', type: 'char', length: 36, nullable: true })
  public ApprovalRequestId!: string | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 500, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => "'[]'::jsonb" })
  public EvidenceRefs!: string[];

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  public ResolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'char', length: 36, nullable: true })
  public ResolvedBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
