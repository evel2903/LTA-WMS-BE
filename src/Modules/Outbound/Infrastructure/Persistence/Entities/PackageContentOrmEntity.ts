import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('IDX_outbound_package_contents_package', ['PackageId'])
@Index('IDX_outbound_package_contents_pick_task', ['PickTaskId'])
@Entity({ name: 'outbound_package_contents' })
export class PackageContentOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'package_id', type: 'char', length: 36 })
  public PackageId!: string;

  @Column({ name: 'pick_task_id', type: 'char', length: 36 })
  public PickTaskId!: string;

  @Column({ name: 'outbound_order_line_id', type: 'char', length: 36 })
  public OutboundOrderLineId!: string;

  @Column({ name: 'source_balance_id', type: 'char', length: 36 })
  public SourceBalanceId!: string;

  @Column({ name: 'source_dimension_id', type: 'char', length: 36 })
  public SourceDimensionId!: string;

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

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 50, nullable: true })
  public InventoryStatusCode!: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 100, nullable: true })
  public LotNumber!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  public SerialNumber!: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  public ExpiryDate!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;
}
