import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { AllocationLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationLineOrmEntity';

@Index('UQ_outbound_allocations_idempotency', ['IdempotencyKey'], { unique: true })
@Index('IDX_outbound_allocations_order_status', ['OutboundOrderId', 'Status'])
@Index('IDX_outbound_allocations_scope_status', ['WarehouseId', 'OwnerId', 'Status'])
@Entity({ name: 'outbound_allocations' })
export class AllocationOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'allocation_number', type: 'varchar', length: 80 })
  public AllocationNumber!: string;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'policy', type: 'varchar', length: 40 })
  public Policy!: string;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'total_ordered_quantity', type: 'numeric', precision: 18, scale: 4 })
  public TotalOrderedQuantity!: number;

  @Column({ name: 'total_allocated_quantity', type: 'numeric', precision: 18, scale: 4 })
  public TotalAllocatedQuantity!: number;

  @Column({ name: 'total_backordered_quantity', type: 'numeric', precision: 18, scale: 4 })
  public TotalBackorderedQuantity!: number;

  @Column({ name: 'shortage_reason', type: 'text', nullable: true })
  public ShortageReason!: string | null;

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

  @OneToMany(() => AllocationLineOrmEntity, (line) => line.Allocation)
  public Lines!: AllocationLineOrmEntity[];
}
