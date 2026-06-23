import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { InventoryMovementStatus } from '@modules/InventoryExecution/Domain/Enums/InventoryMovementStatus';

@Index('IDX_inventory_movements_transaction', ['InventoryTransactionId'])
@Index('IDX_inventory_movements_putaway_task', ['PutawayTaskId'])
@Index('IDX_inventory_movements_from_dimension', ['FromDimensionId'])
@Index('IDX_inventory_movements_to_dimension', ['ToDimensionId'])
@Entity({ name: 'inventory_movements' })
export class InventoryMovementOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'movement_code', type: 'varchar', length: 80, unique: true })
  public MovementCode!: string;

  @Column({ name: 'movement_status', type: 'varchar', length: 40 })
  public MovementStatus!: InventoryMovementStatus;

  @Column({ name: 'inventory_transaction_id', type: 'char', length: 36 })
  public InventoryTransactionId!: string;

  @Column({ name: 'putaway_task_id', type: 'char', length: 36 })
  public PutawayTaskId!: string;

  @Column({ name: 'putaway_task_code', type: 'varchar', length: 80 })
  public PutawayTaskCode!: string;

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

  @Column({ name: 'uom_id', type: 'char', length: 36 })
  public UomId!: string;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 4 })
  public Quantity!: number;

  @Column({ name: 'from_dimension_id', type: 'char', length: 36 })
  public FromDimensionId!: string;

  @Column({ name: 'from_balance_id', type: 'char', length: 36 })
  public FromBalanceId!: string;

  @Column({ name: 'from_location_id', type: 'char', length: 36, nullable: true })
  public FromLocationId!: string | null;

  @Column({ name: 'from_location_code', type: 'varchar', length: 80, nullable: true })
  public FromLocationCode!: string | null;

  @Column({ name: 'from_inventory_status_code', type: 'varchar', length: 80 })
  public FromInventoryStatusCode!: string;

  @Column({ name: 'to_dimension_id', type: 'char', length: 36 })
  public ToDimensionId!: string;

  @Column({ name: 'to_balance_id', type: 'char', length: 36 })
  public ToBalanceId!: string;

  @Column({ name: 'to_location_id', type: 'char', length: 36 })
  public ToLocationId!: string;

  @Column({ name: 'to_location_code', type: 'varchar', length: 80 })
  public ToLocationCode!: string;

  @Column({ name: 'to_inventory_status_code', type: 'varchar', length: 80 })
  public ToInventoryStatusCode!: string;

  @Column({ name: 'lpn_code', type: 'varchar', length: 80, nullable: true })
  public LpnCode!: string | null;

  @Column({ name: 'sscc_code', type: 'varchar', length: 40, nullable: true })
  public SsccCode!: string | null;

  @Column({ name: 'scan_evidence_json', type: 'jsonb', default: () => `'{}'::jsonb` })
  public ScanEvidenceJson!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;
}
