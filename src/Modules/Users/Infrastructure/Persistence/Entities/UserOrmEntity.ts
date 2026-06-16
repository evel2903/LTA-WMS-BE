import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  public FirstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  public LastName!: string;

  @Index({ unique: true })
  @Column({ name: 'email_address', type: 'varchar', length: 255 })
  public EmailAddress!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  public PasswordHash!: string | null;

  @Column({ name: 'role', type: 'varchar', length: 50, default: 'User' })
  public Role!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;
}
