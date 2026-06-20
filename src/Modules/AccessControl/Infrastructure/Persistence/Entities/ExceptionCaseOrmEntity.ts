import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'exception_cases' })
@Index('IDX_exception_cases_state', ['State'])
@Index('IDX_exception_cases_exception_type', ['ExceptionType'])
@Index('IDX_exception_cases_reference', ['ReferenceType', 'ReferenceId'])
@Index('IDX_exception_cases_warehouse', ['WarehouseId'])
@Index('IDX_exception_cases_owner', ['OwnerId'])
@Index('IDX_exception_cases_assigned_to', ['AssignedToUserId'])
export class ExceptionCaseOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'exception_type', type: 'varchar', length: 40 })
  public ExceptionType!: string;

  @Column({ name: 'state', type: 'varchar', length: 40, default: 'DETECTED' })
  public State!: string;

  @Column({ name: 'sub_status', type: 'varchar', length: 30, nullable: true })
  public SubStatus!: string | null;

  @Column({ name: 'outcome', type: 'varchar', length: 30, nullable: true })
  public Outcome!: string | null;

  @Column({ name: 'reference_type', type: 'varchar', length: 60 })
  public ReferenceType!: string;

  @Column({ name: 'reference_id', type: 'varchar', length: 64 })
  public ReferenceId!: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36, nullable: true })
  public WarehouseId!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'assigned_to_user_id', type: 'char', length: 36, nullable: true })
  public AssignedToUserId!: string | null;

  @Column({ name: 'assigned_role_id', type: 'char', length: 36, nullable: true })
  public AssignedRoleId!: string | null;

  @Column({ name: 'detected_rule_id', type: 'char', length: 36, nullable: true })
  public DetectedRuleId!: string | null;

  @Column({ name: 'approval_request_id', type: 'char', length: 36, nullable: true })
  public ApprovalRequestId!: string | null;

  @Column({ name: 'severity', type: 'varchar', length: 20 })
  public Severity!: string;

  @Column({ name: 'evidence_refs', type: 'jsonb', nullable: true })
  public EvidenceRefs!: unknown[] | null;

  @Column({ name: 'resolution_note', type: 'varchar', length: 1000, nullable: true })
  public ResolutionNote!: string | null;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  public OpenedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  public ResolvedAt!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  public ClosedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
