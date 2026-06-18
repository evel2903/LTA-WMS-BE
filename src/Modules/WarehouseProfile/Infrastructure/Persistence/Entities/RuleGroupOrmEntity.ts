import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'rule_groups' })
export class RuleGroupOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_rule_groups_group_code', { unique: true })
  @Column({ name: 'group_code', type: 'varchar', length: 50 })
  public GroupCode!: string;

  @Column({ name: 'group_name', type: 'varchar', length: 255 })
  public GroupName!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  public Description!: string | null;

  @Column({ name: 'catalog_state', type: 'varchar', length: 30 })
  public CatalogState!: string;

  @Column({ name: 'display_order', type: 'integer', nullable: true })
  public DisplayOrder!: number | null;

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
