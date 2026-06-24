import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('IDX_outbound_pack_sessions_pick_task', ['PickTaskId'])
@Index('IDX_outbound_pack_sessions_idempotency', ['IdempotencyKey'], { unique: true })
@Entity({ name: 'outbound_pack_sessions' })
export class PackSessionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'session_number', type: 'varchar', length: 80 })
  public SessionNumber!: string;

  @Column({ name: 'pick_task_id', type: 'char', length: 36 })
  public PickTaskId!: string;

  @Column({ name: 'mobile_task_id', type: 'char', length: 36, nullable: true })
  public MobileTaskId!: string | null;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'warehouse_profile_id', type: 'char', length: 36 })
  public WarehouseProfileId!: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36, nullable: true })
  public WarehouseId!: string | null;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'check_required', type: 'boolean', default: false })
  public CheckRequired!: boolean;

  @Column({ name: 'check_result', type: 'varchar', length: 40 })
  public CheckResult!: string;

  @Column({ name: 'check_exception_case_id', type: 'char', length: 36, nullable: true })
  public CheckExceptionCaseId!: string | null;

  @Column({ name: 'check_reason_code', type: 'varchar', length: 80, nullable: true })
  public CheckReasonCode!: string | null;

  @Column({ name: 'check_reason_code_id', type: 'char', length: 36, nullable: true })
  public CheckReasonCodeId!: string | null;

  @Column({ name: 'check_reason_note', type: 'text', nullable: true })
  public CheckReasonNote!: string | null;

  @Column({ name: 'check_evidence_refs', type: 'jsonb', nullable: true })
  public CheckEvidenceRefs!: string[] | null;

  @Column({ name: 'check_payload_json', type: 'jsonb', nullable: true })
  public CheckPayloadJson!: Record<string, unknown> | null;

  @Column({ name: 'check_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public CheckIdempotencyKey!: string | null;

  @Column({ name: 'check_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public CheckPayloadFingerprint!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  public StartedAt!: Date;

  @Column({ name: 'started_by', type: 'char', length: 36, nullable: true })
  public StartedBy!: string | null;

  @Column({ name: 'checked_at', type: 'timestamptz', nullable: true })
  public CheckedAt!: Date | null;

  @Column({ name: 'checked_by', type: 'char', length: 36, nullable: true })
  public CheckedBy!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 180 })
  public IdempotencyKey!: string;

  @Column({ name: 'payload_fingerprint', type: 'varchar', length: 64 })
  public PayloadFingerprint!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
