import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'roles' })
export class RoleOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_roles_role_code', { unique: true })
  @Column({ name: 'role_code', type: 'varchar', length: 50 })
  public RoleCode!: string;

  @Column({ name: 'role_name', type: 'varchar', length: 255 })
  public RoleName!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  public Description!: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  public IsSystem!: boolean;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'permissions_version', type: 'int', default: 0 })
  public PermissionsVersion!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  // RH-CON-01: application code issues a strict millisecond successor for every real role-row
  // write. A regular column (not @UpdateDateColumn) prevents TypeORM from replacing it with an
  // implicit wall-clock value that can repeat or move behind the locked before-image.
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
