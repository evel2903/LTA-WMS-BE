import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * principal→scope rows. `principal_id` is polymorphic (user/role/group) so there is
 * no hard FK. C1 created the table (schema-only); C2 adds the composite lookup index
 * + unique constraint and does runtime resolution/enforcement.
 */
@Entity({ name: 'data_scopes' })
@Index('IDX_data_scopes_principal_lookup', ['PrincipalType', 'PrincipalId'])
@Unique('UQ_data_scopes_principal_scope', ['PrincipalType', 'PrincipalId', 'ScopeType', 'ScopeValueId'])
export class DataScopeOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'principal_type', type: 'varchar', length: 30 })
  public PrincipalType!: string;

  @Index('IDX_data_scopes_principal')
  @Column({ name: 'principal_id', type: 'char', length: 36 })
  public PrincipalId!: string;

  @Column({ name: 'scope_type', type: 'varchar', length: 30 })
  public ScopeType!: string;

  @Column({ name: 'scope_value_id', type: 'char', length: 36, nullable: true })
  public ScopeValueId!: string | null;

  @Column({ name: 'scope_value_code', type: 'varchar', length: 100, nullable: true })
  public ScopeValueCode!: string | null;

  @Column({ name: 'include_all', type: 'boolean', default: false })
  public IncludeAll!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
