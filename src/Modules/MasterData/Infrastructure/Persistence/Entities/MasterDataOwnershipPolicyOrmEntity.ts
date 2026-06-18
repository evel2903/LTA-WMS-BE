import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

@Unique('UQ_master_data_ownership_policies_object_group', ['ObjectGroup'])
@Entity({ name: 'master_data_ownership_policies' })
export class MasterDataOwnershipPolicyOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'object_group', type: 'varchar', length: 80 })
  public ObjectGroup!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  public DisplayName!: string;

  @Column({ name: 'source_of_truth_type', type: 'varchar', length: 60 })
  public SourceOfTruthType!: string;

  @Column({ name: 'typical_source_systems', type: 'jsonb' })
  public TypicalSourceSystems!: string[];

  @Column({ name: 'ownership_mode', type: 'varchar', length: 80 })
  public OwnershipMode!: string;

  @Column({ name: 'direct_edit_allowed', type: 'boolean', default: false })
  public DirectEditAllowed!: boolean;

  @Column({ name: 'requires_audit', type: 'boolean', default: true })
  public RequiresAudit!: boolean;

  @Column({ name: 'requires_reason', type: 'boolean', default: false })
  public RequiresReason!: boolean;

  @Column({ name: 'requires_source_system', type: 'boolean', default: false })
  public RequiresSourceSystem!: boolean;

  @Column({ name: 'requires_reference_id', type: 'boolean', default: false })
  public RequiresReferenceId!: boolean;

  @Column({ name: 'implementation_status', type: 'varchar', length: 60 })
  public ImplementationStatus!: string;

  @Column({ name: 'deferred_to_story', type: 'varchar', length: 50, nullable: true })
  public DeferredToStory!: string | null;

  @Column({ name: 'policy_notes', type: 'text' })
  public PolicyNotes!: string;

  @Column({ name: 'source_doc_ref', type: 'varchar', length: 80 })
  public SourceDocRef!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
