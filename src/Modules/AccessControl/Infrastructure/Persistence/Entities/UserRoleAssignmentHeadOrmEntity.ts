import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

/** RH-04: per (user, role) head row. `current_intent_version` is the server-assigned ordinal that
 * fences apply; `current_run_id` names the head intent. Bootstrap version 0 / run NULL / Idle. */
@Entity({ name: 'user_role_assignment_heads' })
@Unique('UQ_user_role_assignment_heads_item', ['UserId', 'RoleId'])
export class UserRoleAssignmentHeadOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  public UserId!: string;

  @Column({ name: 'role_id', type: 'char', length: 36 })
  public RoleId!: string;

  @Column({ name: 'current_intent_version', type: 'bigint', default: 0 })
  public CurrentIntentVersion!: string;

  @Column({ name: 'current_run_id', type: 'char', length: 36, nullable: true })
  public CurrentRunId!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'Idle' })
  public Status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
