import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Append-only (DB trigger blocks UPDATE/DELETE). No @UpdateDateColumn by design. */
@Entity({ name: 'audit_logs' })
@Index('IDX_audit_logs_occurred_at', ['OccurredAt'])
@Index('IDX_audit_logs_actor', ['ActorUserId'])
@Index('IDX_audit_logs_object', ['ObjectType', 'ObjectId'])
@Index('IDX_audit_logs_correlation', ['CorrelationId'])
export class AuditLogOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  public OccurredAt!: Date;

  @Column({ name: 'actor_user_id', type: 'char', length: 36, nullable: true })
  public ActorUserId!: string | null;

  @Column({ name: 'actor_role_codes', type: 'jsonb', default: () => "'[]'" })
  public ActorRoleCodes!: string[];

  @Column({ name: 'actor_type', type: 'varchar', length: 20 })
  public ActorType!: string;

  @Column({ name: 'action', type: 'varchar', length: 30 })
  public Action!: string;

  @Column({ name: 'object_type', type: 'varchar', length: 60 })
  public ObjectType!: string;

  @Column({ name: 'object_id', type: 'varchar', length: 64, nullable: true })
  public ObjectId!: string | null;

  @Column({ name: 'object_code', type: 'varchar', length: 100, nullable: true })
  public ObjectCode!: string | null;

  @Column({ name: 'before_json', type: 'jsonb', nullable: true })
  public BeforeJson!: Record<string, unknown> | null;

  @Column({ name: 'after_json', type: 'jsonb', nullable: true })
  public AfterJson!: Record<string, unknown> | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 1000, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', nullable: true })
  public EvidenceRefs!: unknown[] | null;

  @Column({ name: 'reference_type', type: 'varchar', length: 60, nullable: true })
  public ReferenceType!: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  public ReferenceId!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36, nullable: true })
  public WarehouseId!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'scope_json', type: 'jsonb', nullable: true })
  public ScopeJson!: Record<string, unknown> | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 64, nullable: true })
  public CorrelationId!: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  public RequestId!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  public IpAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 400, nullable: true })
  public UserAgent!: string | null;

  @Column({ name: 'result', type: 'varchar', length: 20, default: 'SUCCESS' })
  public Result!: string;
}
