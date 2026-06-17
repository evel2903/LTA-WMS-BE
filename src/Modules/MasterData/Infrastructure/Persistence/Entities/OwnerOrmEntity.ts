import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_owners_owner_code', ['OwnerCode'], { unique: true })
@Entity({ name: 'owners' })
export class OwnerOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 50 })
  public OwnerCode!: string;

  @Column({ name: 'owner_name', type: 'varchar', length: 255 })
  public OwnerName!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'billing_policy', type: 'jsonb', default: () => "'{}'::jsonb" })
  public BillingPolicy!: Record<string, unknown>;

  @Column({ name: 'visibility_scope', type: 'jsonb', default: () => "'{}'::jsonb" })
  public VisibilityScope!: Record<string, unknown>;

  @Column({ name: 'source_system', type: 'varchar', length: 100, nullable: true })
  public SourceSystem!: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 100, nullable: true })
  public ReferenceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
