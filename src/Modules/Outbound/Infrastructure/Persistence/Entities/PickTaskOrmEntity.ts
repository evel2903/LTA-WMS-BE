import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PickReleaseOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickReleaseOrmEntity';

@Index('IDX_outbound_pick_tasks_release', ['PickReleaseId'])
@Index('IDX_outbound_pick_tasks_order_status', ['OutboundOrderId', 'Status'])
@Index('IDX_outbound_pick_tasks_source_location', ['SourceLocationId'])
@Entity({ name: 'outbound_pick_tasks' })
export class PickTaskOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'pick_release_id', type: 'char', length: 36 })
  public PickReleaseId!: string;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'allocation_id', type: 'char', length: 36 })
  public AllocationId!: string;

  @Column({ name: 'allocation_line_id', type: 'char', length: 36 })
  public AllocationLineId!: string;

  @Column({ name: 'outbound_order_line_id', type: 'char', length: 36 })
  public OutboundOrderLineId!: string;

  @Column({ name: 'task_number', type: 'varchar', length: 80 })
  public TaskNumber!: string;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'sequence', type: 'integer' })
  public Sequence!: number;

  @Column({ name: 'batch_number', type: 'varchar', length: 80, nullable: true })
  public BatchNumber!: string | null;

  @Column({ name: 'source_balance_id', type: 'char', length: 36 })
  public SourceBalanceId!: string;

  @Column({ name: 'source_dimension_id', type: 'char', length: 36 })
  public SourceDimensionId!: string;

  @Column({ name: 'source_location_id', type: 'char', length: 36 })
  public SourceLocationId!: string;

  @Column({ name: 'target_location_id', type: 'char', length: 36, nullable: true })
  public TargetLocationId!: string | null;

  @Column({ name: 'target_reference', type: 'varchar', length: 180, nullable: true })
  public TargetReference!: string | null;

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

  @ManyToOne(() => PickReleaseOrmEntity, (release) => release.Tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pick_release_id' })
  public PickRelease!: PickReleaseOrmEntity;
}
