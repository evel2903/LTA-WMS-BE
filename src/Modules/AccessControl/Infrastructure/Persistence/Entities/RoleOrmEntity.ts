import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
