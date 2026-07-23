import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** RH-04: durable per-user assignment-set version. `bigint` is mapped to string to keep BIGINT
 * precision (values can exceed Number.MAX_SAFE_INTEGER). Bootstrap 0; first real change -> "1". */
@Entity({ name: 'user_effective_versions' })
export class UserEffectiveVersionOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'char', length: 36 })
  public UserId!: string;

  @Column({ name: 'effective_version', type: 'bigint', default: 0 })
  public EffectiveVersion!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
