import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_location_profiles_profile_code', ['ProfileCode'], { unique: true })
@Entity({ name: 'location_profiles' })
export class LocationProfileOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'profile_code', type: 'varchar', length: 50 })
  public ProfileCode!: string;

  @Column({ name: 'profile_name', type: 'varchar', length: 255 })
  public ProfileName!: string;

  @Column({ name: 'location_type', type: 'varchar', length: 50 })
  public LocationType!: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  public Version!: number;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'capacity_policy', type: 'jsonb', default: () => "'{}'::jsonb" })
  public CapacityPolicy!: Record<string, unknown>;

  @Column({ name: 'eligibility_policy', type: 'jsonb', default: () => "'{}'::jsonb" })
  public EligibilityPolicy!: Record<string, unknown>;

  @Column({ name: 'mix_policy', type: 'jsonb', default: () => "'{}'::jsonb" })
  public MixPolicy!: Record<string, unknown>;

  @Column({ name: 'compliance_policy', type: 'jsonb', default: () => "'{}'::jsonb" })
  public CompliancePolicy!: Record<string, unknown>;

  @Column({ name: 'operation_policy', type: 'jsonb', default: () => "'{}'::jsonb" })
  public OperationPolicy!: Record<string, unknown>;

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
