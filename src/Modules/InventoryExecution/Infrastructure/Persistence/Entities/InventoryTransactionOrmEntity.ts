import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { InventoryTransactionStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionStatus';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';

@Index('IDX_inventory_transactions_scope_status', ['WarehouseId', 'OwnerId', 'TransactionStatus'])
@Index('IDX_inventory_transactions_putaway_task', ['PutawayTaskId'])
@Index('UQ_inventory_transactions_idempotency', ['PutawayTaskId', 'IdempotencyKey'], { unique: true })
@Index('UQ_inventory_transactions_operation_idempotency_no_task', ['TransactionType', 'IdempotencyKey'], {
  unique: true,
  where: '"putaway_task_id" IS NULL',
})
@Entity({ name: 'inventory_transactions' })
export class InventoryTransactionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'transaction_code', type: 'varchar', length: 80, unique: true })
  public TransactionCode!: string;

  @Column({ name: 'transaction_type', type: 'varchar', length: 40 })
  public TransactionType!: InventoryTransactionType;

  @Column({ name: 'transaction_status', type: 'varchar', length: 40 })
  public TransactionStatus!: InventoryTransactionStatus;

  @Column({ name: 'putaway_task_id', type: 'char', length: 36, nullable: true })
  public PutawayTaskId!: string | null;

  @Column({ name: 'putaway_task_code', type: 'varchar', length: 80, nullable: true })
  public PutawayTaskCode!: string | null;

  @Column({ name: 'inventory_movement_id', type: 'char', length: 36, nullable: true })
  public InventoryMovementId!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Column({ name: 'sku_code', type: 'varchar', length: 80, nullable: true })
  public SkuCode!: string | null;

  @Column({ name: 'uom_id', type: 'char', length: 36, nullable: true })
  public UomId!: string | null;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 4 })
  public Quantity!: number;

  @Column({ name: 'from_inventory_status_code', type: 'varchar', length: 80 })
  public FromInventoryStatusCode!: string;

  @Column({ name: 'to_inventory_status_code', type: 'varchar', length: 80 })
  public ToInventoryStatusCode!: string;

  @Column({ name: 'from_location_id', type: 'char', length: 36, nullable: true })
  public FromLocationId!: string | null;

  @Column({ name: 'from_location_code', type: 'varchar', length: 80, nullable: true })
  public FromLocationCode!: string | null;

  @Column({ name: 'to_location_id', type: 'char', length: 36 })
  public ToLocationId!: string;

  @Column({ name: 'to_location_code', type: 'varchar', length: 80 })
  public ToLocationCode!: string;

  @Column({ name: 'lpn_code', type: 'varchar', length: 80, nullable: true })
  public LpnCode!: string | null;

  @Column({ name: 'sscc_code', type: 'varchar', length: 40, nullable: true })
  public SsccCode!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  public IdempotencyKey!: string;

  @Column({ name: 'outbox_message_id', type: 'char', length: 36, nullable: true })
  public OutboxMessageId!: string | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'posted_at', type: 'timestamptz' })
  public PostedAt!: Date;

  @Column({ name: 'posted_by', type: 'char', length: 36, nullable: true })
  public PostedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
