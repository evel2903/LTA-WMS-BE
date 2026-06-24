import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_integration_outbox_message_id', ['MessageId'], { unique: true })
@Index('IDX_integration_outbox_business_reference', ['BusinessReference', 'WarehouseContext', 'OwnerContext'])
@Index('IDX_integration_outbox_source_status', ['SourceSystem', 'Status'])
@Entity({ name: 'integration_outbox_messages' })
export class OutboxMessageOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'source_message_id', type: 'char', length: 36, nullable: true })
  public SourceMessageId!: string | null;

  @Column({ name: 'message_id', type: 'varchar', length: 120 })
  public MessageId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  public EventType!: string;

  @Column({ name: 'version', type: 'varchar', length: 30 })
  public Version!: string;

  @Column({ name: 'business_reference', type: 'varchar', length: 120 })
  public BusinessReference!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 100 })
  public SourceSystem!: string;

  @Column({ name: 'target_system', type: 'varchar', length: 100 })
  public TargetSystem!: string;

  @Column({ name: 'warehouse_context', type: 'varchar', length: 100 })
  public WarehouseContext!: string;

  @Column({ name: 'owner_context', type: 'varchar', length: 100, nullable: true })
  public OwnerContext!: string | null;

  @Column({ name: 'event_time', type: 'timestamptz' })
  public EventTime!: Date;

  @Column({ name: 'correlation_id', type: 'varchar', length: 120, nullable: true })
  public CorrelationId!: string | null;

  @Column({ name: 'causation_id', type: 'varchar', length: 120, nullable: true })
  public CausationId!: string | null;

  @Column({ name: 'payload', type: 'jsonb' })
  public Payload!: Record<string, unknown>;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  public AttemptCount!: number;

  @Column({ name: 'max_attempts', type: 'integer', default: 5 })
  public MaxAttempts!: number;

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  public NextRetryAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  public LastError!: string | null;

  @Column({ name: 'failure_category', type: 'varchar', length: 40, nullable: true })
  public FailureCategory!: string | null;

  @Column({ name: 'dead_letter_reason', type: 'text', nullable: true })
  public DeadLetterReason!: string | null;

  @Column({ name: 'dead_lettered_at', type: 'timestamptz', nullable: true })
  public DeadLetteredAt!: Date | null;

  @Column({ name: 'resolution_action', type: 'varchar', length: 40, nullable: true })
  public ResolutionAction!: string | null;

  @Column({ name: 'action_idempotency_key', type: 'varchar', length: 120, nullable: true })
  public ActionIdempotencyKey!: string | null;

  @Column({ name: 'action_payload_hash', type: 'varchar', length: 128, nullable: true })
  public ActionPayloadHash!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  public ResolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'char', length: 36, nullable: true })
  public ResolvedBy!: string | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 500, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => "'[]'::jsonb" })
  public EvidenceRefs!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
