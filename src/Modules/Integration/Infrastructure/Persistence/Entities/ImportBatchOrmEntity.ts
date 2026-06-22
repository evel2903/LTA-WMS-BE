import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('IDX_integration_import_batches_source_status', ['SourceSystem', 'Status'])
@Entity({ name: 'integration_import_batches' })
export class ImportBatchOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'batch_reference', type: 'varchar', length: 100, nullable: true })
  public BatchReference!: string | null;

  @Column({ name: 'source_system', type: 'varchar', length: 100, nullable: true })
  public SourceSystem!: string | null;

  @Column({ name: 'target_system', type: 'varchar', length: 100, nullable: true })
  public TargetSystem!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'message_count', type: 'int' })
  public MessageCount!: number;

  @Column({ name: 'accepted_count', type: 'int' })
  public AcceptedCount!: number;

  @Column({ name: 'duplicate_count', type: 'int' })
  public DuplicateCount!: number;

  @Column({ name: 'rejected_count', type: 'int' })
  public RejectedCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;
}
