import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'permissions' })
@Unique('UQ_permissions_action_object', ['Action', 'ObjectType'])
export class PermissionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_permissions_permission_code', { unique: true })
  @Column({ name: 'permission_code', type: 'varchar', length: 160 })
  public PermissionCode!: string;

  @Column({ name: 'action', type: 'varchar', length: 30 })
  public Action!: string;

  @Column({ name: 'object_type', type: 'varchar', length: 50 })
  public ObjectType!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  public Description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
