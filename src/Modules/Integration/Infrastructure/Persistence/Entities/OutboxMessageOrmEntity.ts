import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('UQ_integration_outbox_message_id', ['MessageId'], { unique: true })
@Index('IDX_integration_outbox_business_reference', ['BusinessReference', 'WarehouseContext', 'OwnerContext'])
@Index('IDX_integration_outbox_source_status', ['SourceSystem', 'Status'])
@Entity({ name: 'integration_outbox_messages' })
export class OutboxMessageOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'source_message_id', type: 'char', length: 36, nullable: true })
  public SourceMessageId!: string | null;

  @Column({ name: 'message_id', type: 'varchar', length: 120 })
  public MessageId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  public EventType!: string;

  @Column({ name: 'version', type: 'varchar', length: 30 })
  public Version!: string;

  @Column({ name: 'business_reference', type: 'varchar', length: 120 })
  public BusinessReference!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 100 })
  public SourceSystem!: string;

  @Column({ name: 'target_system', type: 'varchar', length: 100 })
  public TargetSystem!: string;

  @Column({ name: 'warehouse_context', type: 'varchar', length: 100 })
  public WarehouseContext!: string;

  @Column({ name: 'owner_context', type: 'varchar', length: 100, nullable: true })
  public OwnerContext!: string | null;

  @Column({ name: 'event_time', type: 'timestamptz' })
  public EventTime!: Date;

  @Column({ name: 'correlation_id', type: 'varchar', length: 120, nullable: true })
  public CorrelationId!: string | null;

  @Column({ name: 'causation_id', type: 'varchar', length: 120, nullable: true })
  public CausationId!: string | null;

  @Column({ name: 'payload', type: 'jsonb' })
  public Payload!: Record<string, unknown>;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;
}
