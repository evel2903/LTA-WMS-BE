import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'warehouse_profile_rules' })
@Index('UQ_warehouse_profile_rules_profile_rule', ['WarehouseProfileId', 'RuleDefinitionId'], { unique: true })
export class WarehouseProfileRuleOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'warehouse_profile_id', type: 'char', length: 36 })
  public WarehouseProfileId!: string;

  @Column({ name: 'rule_definition_id', type: 'char', length: 36 })
  public RuleDefinitionId!: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  public IsEnabled!: boolean;

  @Column({ name: 'override_priority', type: 'integer', nullable: true })
  public OverridePriority!: number | null;

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
