import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'override_logs' })
@Index('IDX_override_logs_rule', ['RuleId'])
@Index('IDX_override_logs_actor', ['ActorUserId'])
@Index('IDX_override_logs_target', ['TargetObjectType', 'TargetObjectId'])
@Index('IDX_override_logs_created_at', ['CreatedAt'])
export class OverrideLogOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'rule_id', type: 'char', length: 36 })
  public RuleId!: string;

  @Column({ name: 'rule_code', type: 'varchar', length: 100 })
  public RuleCode!: string;

  @Column({ name: 'actor_user_id', type: 'char', length: 36 })
  public ActorUserId!: string;

  @Column({ name: 'target_object_type', type: 'varchar', length: 60 })
  public TargetObjectType!: string;

  @Column({ name: 'target_object_id', type: 'varchar', length: 64 })
  public TargetObjectId!: string;

  @Column({ name: 'target_object_code', type: 'varchar', length: 100, nullable: true })
  public TargetObjectCode!: string | null;

  @Column({ name: 'scope', type: 'jsonb', nullable: true })
  public Scope!: Record<string, unknown> | null;

  @Column({ name: 'control_mode', type: 'varchar', length: 30 })
  public ControlMode!: string;

  @Column({ name: 'action', type: 'varchar', length: 30, default: 'Override' })
  public Action!: string;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 1000, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', nullable: true })
  public EvidenceRefs!: unknown[] | null;

  @Column({ name: 'approval_request_id', type: 'char', length: 36, nullable: true })
  public ApprovalRequestId!: string | null;

  @Column({ name: 'before_json', type: 'jsonb', nullable: true })
  public BeforeJson!: Record<string, unknown> | null;

  @Column({ name: 'after_json', type: 'jsonb', nullable: true })
  public AfterJson!: Record<string, unknown> | null;

  @Column({ name: 'audit_ref', type: 'varchar', length: 64, nullable: true })
  public AuditRef!: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 64, nullable: true })
  public CorrelationId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;
}
