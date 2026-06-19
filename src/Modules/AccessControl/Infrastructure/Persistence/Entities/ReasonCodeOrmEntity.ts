import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'reason_codes' })
@Index('IDX_reason_codes_group', ['ReasonGroup'])
export class ReasonCodeOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_reason_codes_code', { unique: true })
  @Column({ name: 'reason_code', type: 'varchar', length: 60 })
  public ReasonCode!: string;

  @Column({ name: 'reason_group', type: 'varchar', length: 60 })
  public ReasonGroup!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  public Description!: string | null;

  @Column({ name: 'applies_to_actions', type: 'jsonb', default: () => "'[]'" })
  public AppliesToActions!: string[];

  @Column({ name: 'applies_to_objects', type: 'jsonb', default: () => "'[]'" })
  public AppliesToObjects!: string[];

  @Column({ name: 'evidence_required', type: 'boolean', default: false })
  public EvidenceRequired!: boolean;

  @Column({ name: 'approval_required', type: 'boolean', default: false })
  public ApprovalRequired!: boolean;

  @Column({ name: 'allowed_role_codes', type: 'jsonb', nullable: true })
  public AllowedRoleCodes!: string[] | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  public Status!: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  public Version!: number;

  @Column({ name: 'effective_from', type: 'timestamptz', nullable: true })
  public EffectiveFrom!: Date | null;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  public EffectiveTo!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
