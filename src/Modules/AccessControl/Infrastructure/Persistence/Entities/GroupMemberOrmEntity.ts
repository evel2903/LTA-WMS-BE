import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

/** Schema-only in C1 (see GroupOrmEntity). */
@Entity({ name: 'group_members' })
@Unique('UQ_group_members_group_user', ['GroupId', 'UserId'])
export class GroupMemberOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index('IDX_group_members_group_id')
  @Column({ name: 'group_id', type: 'char', length: 36 })
  public GroupId!: string;

  @Index('IDX_group_members_user_id')
  @Column({ name: 'user_id', type: 'char', length: 36 })
  public UserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;
}
