import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { OutboundOrderLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderLineOrmEntity';

@Index('UQ_outbound_orders_business_key', ['SourceSystem', 'SourceReference', 'OwnerId', 'WarehouseId'], {
  unique: true,
})
@Index('UQ_outbound_orders_import_idempotency', ['ImportIdempotencyKey'], { unique: true })
@Index('IDX_outbound_orders_scope_status', ['WarehouseId', 'OwnerId', 'DocumentStatus'])
@Index('IDX_outbound_orders_customer', ['CustomerId'])
@Entity({ name: 'outbound_orders' })
export class OutboundOrderOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'order_number', type: 'varchar', length: 80 })
  public OrderNumber!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 100 })
  public SourceSystem!: string;

  @Column({ name: 'source_reference', type: 'varchar', length: 120 })
  public SourceReference!: string;

  @Column({ name: 'business_reference', type: 'varchar', length: 180 })
  public BusinessReference!: string;

  @Column({ name: 'customer_id', type: 'char', length: 36, nullable: true })
  public CustomerId!: string | null;

  @Column({ name: 'customer_source_system', type: 'varchar', length: 100, nullable: true })
  public CustomerSourceSystem!: string | null;

  @Column({ name: 'customer_external_reference', type: 'varchar', length: 120, nullable: true })
  public CustomerExternalReference!: string | null;

  @Column({ name: 'customer_code', type: 'varchar', length: 80, nullable: true })
  public CustomerCode!: string | null;

  @Column({ name: 'ship_to_reference', type: 'varchar', length: 160, nullable: true })
  public ShipToReference!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'priority', type: 'integer', nullable: true })
  public Priority!: number | null;

  @Column({ name: 'cutoff_at', type: 'timestamptz', nullable: true })
  public CutoffAt!: Date | null;

  @Column({ name: 'document_status', type: 'varchar', length: 40 })
  public DocumentStatus!: string;

  @Column({ name: 'validation_errors', type: 'jsonb', default: () => `'[]'::jsonb` })
  public ValidationErrors!: string[];

  @Column({ name: 'core_flow_instance_id', type: 'char', length: 36, nullable: true })
  public CoreFlowInstanceId!: string | null;

  @Column({ name: 'outbox_message_id', type: 'char', length: 36, nullable: true })
  public OutboxMessageId!: string | null;

  @Column({ name: 'import_idempotency_key', type: 'varchar', length: 180 })
  public ImportIdempotencyKey!: string;

  @Column({ name: 'import_payload_fingerprint', type: 'varchar', length: 64 })
  public ImportPayloadFingerprint!: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'action_idempotency', type: 'jsonb', default: () => `'{}'::jsonb` })
  public ActionIdempotency!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;

  @OneToMany(() => OutboundOrderLineOrmEntity, (line) => line.OutboundOrder)
  public Lines!: OutboundOrderLineOrmEntity[];
}
