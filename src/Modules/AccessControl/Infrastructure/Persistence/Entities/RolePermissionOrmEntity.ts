import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'role_permissions' })
@Unique('UQ_role_permissions_role_permission', ['RoleId', 'PermissionId'])
export class RolePermissionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('IDX_role_permissions_role_id')
  @Column({ name: 'role_id', type: 'char', length: 36 })
  public RoleId!: string;

  @Index('IDX_role_permissions_permission_id')
  @Column({ name: 'permission_id', type: 'char', length: 36 })
  public PermissionId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;
}
