import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn({ type: 'char', length: 36 })
  public Id!: string;

  @Column({ type: 'varchar', length: 100 })
  public FirstName!: string;

  @Column({ type: 'varchar', length: 100 })
  public LastName!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  public EmailAddress!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  public PasswordHash!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'User' })
  public Role!: string;

  @CreateDateColumn({ type: 'datetime' })
  public CreatedAt!: Date;
}
