import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'control_exception_catalog' })
export class ControlExceptionCatalogOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_control_exception_catalog_code', { unique: true })
  @Column({ name: 'code', type: 'varchar', length: 40 })
  public Code!: string;

  @Column({ name: 'scenario', type: 'varchar', length: 500 })
  public Scenario!: string;

  @Column({ name: 'category', type: 'varchar', length: 60 })
  public Category!: string;

  @Column({ name: 'severity', type: 'varchar', length: 20 })
  public Severity!: string;

  @Column({ name: 'default_state', type: 'varchar', length: 30 })
  public DefaultState!: string;

  @Column({ name: 'action_allowed', type: 'varchar', length: 40 })
  public ActionAllowed!: string;

  @Column({ name: 'reason_required', type: 'boolean', default: false })
  public ReasonRequired!: boolean;

  @Column({ name: 'evidence_required', type: 'boolean', default: false })
  public EvidenceRequired!: boolean;

  @Column({ name: 'approval_required', type: 'boolean', default: false })
  public ApprovalRequired!: boolean;

  @Column({ name: 'owner_roles', type: 'jsonb', default: () => "'[]'" })
  public OwnerRoles!: string[];

  @Column({ name: 'implementation_status', type: 'varchar', length: 30 })
  public ImplementationStatus!: string;

  @Column({ name: 'source_doc_ref', type: 'varchar', length: 120, nullable: true })
  public SourceDocRef!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
