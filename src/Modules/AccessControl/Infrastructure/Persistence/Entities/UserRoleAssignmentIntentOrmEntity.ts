import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** RH-04: append-only intent ticket, keyed by the FE-generated `run_id`. Never deleted in Epic 30
 * (idempotency/replay evidence). `outcome` persists the terminal HTTP/business result so a lost
 * response is recovered by exact replay without re-running the effect. */
@Entity({ name: 'user_role_assignment_intents' })
@Index('IDX_user_role_assignment_intents_item', ['UserId', 'RoleId'])
export class UserRoleAssignmentIntentOrmEntity {
  @PrimaryColumn({ name: 'run_id', type: 'char', length: 36 })
  public RunId!: string;

  @Column({ name: 'actor_user_id', type: 'char', length: 36 })
  public ActorUserId!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  public UserId!: string;

  @Column({ name: 'role_id', type: 'char', length: 36 })
  public RoleId!: string;

  @Column({ name: 'canonical_role_code', type: 'varchar', length: 50 })
  public CanonicalRoleCode!: string;

  @Column({ name: 'operation', type: 'varchar', length: 10 })
  public Operation!: string;

  @Column({ name: 'intent_version', type: 'bigint' })
  public IntentVersion!: string;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  public Status!: string;

  @Column({ name: 'effective_version', type: 'bigint', nullable: true })
  public EffectiveVersion!: string | null;

  @Column({ name: 'outcome', type: 'jsonb', nullable: true })
  public Outcome!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;
}
