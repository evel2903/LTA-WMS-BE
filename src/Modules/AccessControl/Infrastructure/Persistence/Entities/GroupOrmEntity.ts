import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Schema-only in C1: the table exists so C2+ can attach members and data scopes.
 * No repository/use case yet.
 */
@Entity({ name: 'groups' })
export class GroupOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('UQ_groups_group_code', { unique: true })
  @Column({ name: 'group_code', type: 'varchar', length: 50 })
  public GroupCode!: string;

  @Column({ name: 'group_name', type: 'varchar', length: 255 })
  public GroupName!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  public Description!: string | null;

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
