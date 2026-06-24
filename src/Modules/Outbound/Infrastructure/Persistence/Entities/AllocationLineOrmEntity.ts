import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AllocationOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationOrmEntity';

@Index('IDX_outbound_allocation_lines_allocation', ['AllocationId'])
@Index('IDX_outbound_allocation_lines_order_line', ['OutboundOrderLineId'])
@Index('IDX_outbound_allocation_lines_source_balance', ['SourceBalanceId'])
@Entity({ name: 'outbound_allocation_lines' })
export class AllocationLineOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'allocation_id', type: 'char', length: 36 })
  public AllocationId!: string;

  @Column({ name: 'outbound_order_line_id', type: 'char', length: 36 })
  public OutboundOrderLineId!: string;

  @Column({ name: 'line_number', type: 'integer' })
  public LineNumber!: number;

  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Column({ name: 'sku_code', type: 'varchar', length: 80, nullable: true })
  public SkuCode!: string | null;

  @Column({ name: 'uom_id', type: 'char', length: 36 })
  public UomId!: string;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'ordered_quantity', type: 'numeric', precision: 18, scale: 4 })
  public OrderedQuantity!: number;

  @Column({ name: 'allocated_quantity', type: 'numeric', precision: 18, scale: 4 })
  public AllocatedQuantity!: number;

  @Column({ name: 'backordered_quantity', type: 'numeric', precision: 18, scale: 4 })
  public BackorderedQuantity!: number;

  @Column({ name: 'source_balance_id', type: 'char', length: 36, nullable: true })
  public SourceBalanceId!: string | null;

  @Column({ name: 'source_dimension_id', type: 'char', length: 36, nullable: true })
  public SourceDimensionId!: string | null;

  @Column({ name: 'source_location_id', type: 'char', length: 36, nullable: true })
  public SourceLocationId!: string | null;

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 50, nullable: true })
  public InventoryStatusCode!: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 100, nullable: true })
  public LotNumber!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  public SerialNumber!: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  public ExpiryDate!: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'shortage_reason', type: 'text', nullable: true })
  public ShortageReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @ManyToOne(() => AllocationOrmEntity, (allocation) => allocation.Lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allocation_id' })
  public Allocation!: AllocationOrmEntity;
}
