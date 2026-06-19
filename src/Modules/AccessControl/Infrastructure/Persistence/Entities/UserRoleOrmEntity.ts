import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'user_roles' })
@Unique('UQ_user_roles_user_role', ['UserId', 'RoleId'])
export class UserRoleOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('IDX_user_roles_user_id')
  @Column({ name: 'user_id', type: 'char', length: 36 })
  public UserId!: string;

  @Index('IDX_user_roles_role_id')
  @Column({ name: 'role_id', type: 'char', length: 36 })
  public RoleId!: string;

  @Column({ name: 'source', type: 'varchar', length: 30 })
  public Source!: string;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  public AssignedAt!: Date;

  @Column({ name: 'assigned_by', type: 'char', length: 36, nullable: true })
  public AssignedBy!: string | null;
}
