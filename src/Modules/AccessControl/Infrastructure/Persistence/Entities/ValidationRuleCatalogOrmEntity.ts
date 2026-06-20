import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'validation_rule_catalog' })
export class ValidationRuleCatalogOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_validation_rule_catalog_code', { unique: true })
  @Column({ name: 'code', type: 'varchar', length: 40 })
  public Code!: string;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  public Description!: string;

  @Column({ name: 'trigger', type: 'varchar', length: 500 })
  public Trigger!: string;

  @Column({ name: 'expected_result', type: 'varchar', length: 500 })
  public ExpectedResult!: string;

  @Column({ name: 'owner_module', type: 'varchar', length: 60 })
  public OwnerModule!: string;

  @Column({ name: 'control_exception_code', type: 'varchar', length: 40, nullable: true })
  public ControlExceptionCode!: string | null;

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
