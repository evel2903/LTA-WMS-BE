import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PickTaskOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickTaskOrmEntity';

@Index('UQ_outbound_pick_releases_idempotency', ['IdempotencyKey'], { unique: true })
@Index('IDX_outbound_pick_releases_order_status', ['OutboundOrderId', 'Status'])
@Index('IDX_outbound_pick_releases_scope_status', ['WarehouseId', 'OwnerId', 'Status'])
@Entity({ name: 'outbound_pick_releases' })
export class PickReleaseOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'release_number', type: 'varchar', length: 80 })
  public ReleaseNumber!: string;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'allocation_id', type: 'char', length: 36 })
  public AllocationId!: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'release_mode', type: 'varchar', length: 40 })
  public ReleaseMode!: string;

  @Column({ name: 'batch_size', type: 'integer' })
  public BatchSize!: number;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'block_reason', type: 'text', nullable: true })
  public BlockReason!: string | null;

  @Column({ name: 'total_task_count', type: 'integer' })
  public TotalTaskCount!: number;

  @Column({ name: 'total_released_quantity', type: 'numeric', precision: 18, scale: 4 })
  public TotalReleasedQuantity!: number;

  @Column({ name: 'outbox_message_id', type: 'char', length: 36, nullable: true })
  public OutboxMessageId!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 180 })
  public IdempotencyKey!: string;

  @Column({ name: 'payload_fingerprint', type: 'varchar', length: 64 })
  public PayloadFingerprint!: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;

  @OneToMany(() => PickTaskOrmEntity, (task) => task.PickRelease)
  public Tasks!: PickTaskOrmEntity[];
}
