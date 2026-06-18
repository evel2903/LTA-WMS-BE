import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';

@Index('UQ_item_coverages_sku_warehouse_global_owner', ['SkuId', 'WarehouseId'], {
  unique: true,
  where: `"owner_id" IS NULL`,
})
@Index('UQ_item_coverages_sku_warehouse_owner', ['SkuId', 'WarehouseId', 'OwnerId'], {
  unique: true,
  where: `"owner_id" IS NOT NULL`,
})
@Entity({ name: 'item_coverages' })
export class ItemCoverageOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Index()
  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'min_qty', type: 'numeric', precision: 18, scale: 6, nullable: true })
  public MinQty!: number | null;

  @Column({ name: 'max_qty', type: 'numeric', precision: 18, scale: 6, nullable: true })
  public MaxQty!: number | null;

  @Column({ name: 'standard_qty', type: 'numeric', precision: 18, scale: 6, nullable: true })
  public StandardQty!: number | null;

  @Column({ name: 'multiple_qty', type: 'numeric', precision: 18, scale: 6, nullable: true })
  public MultipleQty!: number | null;

  @Column({ name: 'lead_time_days', type: 'integer', nullable: true })
  public LeadTimeDays!: number | null;

  @Column({ name: 'default_receive_warehouse_id', type: 'char', length: 36, nullable: true })
  public DefaultReceiveWarehouseId!: string | null;

  @Column({ name: 'default_ship_warehouse_id', type: 'char', length: 36, nullable: true })
  public DefaultShipWarehouseId!: string | null;

  @Column({ name: 'reorder_policy', type: 'jsonb', nullable: true })
  public ReorderPolicy!: Record<string, unknown> | null;

  @Column({ name: 'stop_receiving', type: 'boolean', default: false })
  public StopReceiving!: boolean;

  @Column({ name: 'stop_shipping', type: 'boolean', default: false })
  public StopShipping!: boolean;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 100, nullable: true })
  public SourceSystem!: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 100, nullable: true })
  public ReferenceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;

  @ManyToOne(() => SkuOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sku_id', referencedColumnName: 'Id' })
  public Sku!: SkuOrmEntity;

  @ManyToOne(() => WarehouseOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', referencedColumnName: 'Id' })
  public Warehouse!: WarehouseOrmEntity;

  @ManyToOne(() => OwnerOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id', referencedColumnName: 'Id' })
  public Owner!: OwnerOrmEntity | null;

  @ManyToOne(() => WarehouseOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'default_receive_warehouse_id', referencedColumnName: 'Id' })
  public DefaultReceiveWarehouse!: WarehouseOrmEntity | null;

  @ManyToOne(() => WarehouseOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'default_ship_warehouse_id', referencedColumnName: 'Id' })
  public DefaultShipWarehouse!: WarehouseOrmEntity | null;
}
