import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'approval_requests' })
@Index('IDX_approval_requests_decision', ['Decision'])
@Index('IDX_approval_requests_requester', ['RequesterUserId'])
@Index('IDX_approval_requests_target', ['TargetObjectType', 'TargetObjectId'])
export class ApprovalRequestOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'requester_user_id', type: 'char', length: 36 })
  public RequesterUserId!: string;

  @Column({ name: 'action', type: 'varchar', length: 30 })
  public Action!: string;

  @Column({ name: 'target_object_type', type: 'varchar', length: 60 })
  public TargetObjectType!: string;

  @Column({ name: 'target_object_id', type: 'varchar', length: 64 })
  public TargetObjectId!: string;

  @Column({ name: 'target_object_code', type: 'varchar', length: 100, nullable: true })
  public TargetObjectCode!: string | null;

  @Column({ name: 'scope', type: 'jsonb', nullable: true })
  public Scope!: Record<string, unknown> | null;

  @Column({ name: 'request_reason_code_id', type: 'char', length: 36, nullable: true })
  public RequestReasonCodeId!: string | null;

  @Column({ name: 'request_reason_note', type: 'varchar', length: 1000, nullable: true })
  public RequestReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', nullable: true })
  public EvidenceRefs!: unknown[] | null;

  @Column({ name: 'decision', type: 'varchar', length: 20, default: 'PENDING' })
  public Decision!: string;

  @Column({ name: 'decided_by_user_id', type: 'char', length: 36, nullable: true })
  public DecidedByUserId!: string | null;

  @Column({ name: 'decision_reason_code_id', type: 'char', length: 36, nullable: true })
  public DecisionReasonCodeId!: string | null;

  @Column({ name: 'decision_note', type: 'varchar', length: 1000, nullable: true })
  public DecisionNote!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  public DecidedAt!: Date | null;

  @Column({ name: 'reference_type', type: 'varchar', length: 60, nullable: true })
  public ReferenceType!: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  public ReferenceId!: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 64, nullable: true })
  public CorrelationId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
