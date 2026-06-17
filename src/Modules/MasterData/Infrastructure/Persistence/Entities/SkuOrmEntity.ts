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
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';

@Index('UQ_skus_sku_code', ['SkuCode'], { unique: true })
@Entity({ name: 'skus' })
export class SkuOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'sku_code', type: 'varchar', length: 80 })
  public SkuCode!: string;

  @Column({ name: 'sku_name', type: 'varchar', length: 255 })
  public SkuName!: string;

  @Index()
  @Column({ name: 'default_owner_id', type: 'char', length: 36, nullable: true })
  public DefaultOwnerId!: string | null;

  @Column({ name: 'item_class', type: 'varchar', length: 50 })
  public ItemClass!: string;

  @Column({ name: 'item_status', type: 'varchar', length: 30 })
  public ItemStatus!: string;

  @Index()
  @Column({ name: 'base_uom_id', type: 'char', length: 36 })
  public BaseUomId!: string;

  @Index()
  @Column({ name: 'inventory_uom_id', type: 'char', length: 36 })
  public InventoryUomId!: string;

  @Column({ name: 'lot_controlled', type: 'boolean', default: false })
  public LotControlled!: boolean;

  @Column({ name: 'expiry_controlled', type: 'boolean', default: false })
  public ExpiryControlled!: boolean;

  @Column({ name: 'serial_controlled', type: 'boolean', default: false })
  public SerialControlled!: boolean;

  @Column({ name: 'owner_controlled', type: 'boolean', default: false })
  public OwnerControlled!: boolean;

  @Column({ name: 'lpn_controlled', type: 'boolean', default: false })
  public LpnControlled!: boolean;

  @Column({ name: 'temperature_controlled', type: 'boolean', default: false })
  public TemperatureControlled!: boolean;

  @Column({ name: 'dg_controlled', type: 'boolean', default: false })
  public DgControlled!: boolean;

  @Column({ name: 'customs_controlled', type: 'boolean', default: false })
  public CustomsControlled!: boolean;

  @Column({ name: 'qc_required', type: 'boolean', default: false })
  public QcRequired!: boolean;

  @Column({ name: 'temperature_class', type: 'varchar', length: 50, nullable: true })
  public TemperatureClass!: string | null;

  @Column({ name: 'dg_class', type: 'varchar', length: 50, nullable: true })
  public DgClass!: string | null;

  @Column({ name: 'bonded_flag', type: 'boolean', default: false })
  public BondedFlag!: boolean;

  @Column({ name: 'shelf_life_days', type: 'integer', nullable: true })
  public ShelfLifeDays!: number | null;

  @Column({ name: 'min_remaining_shelf_life_days', type: 'integer', nullable: true })
  public MinRemainingShelfLifeDays!: number | null;

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

  @ManyToOne(() => OwnerOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'default_owner_id', referencedColumnName: 'Id' })
  public DefaultOwner!: OwnerOrmEntity | null;

  @ManyToOne(() => UomOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'base_uom_id', referencedColumnName: 'Id' })
  public BaseUom!: UomOrmEntity;

  @ManyToOne(() => UomOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventory_uom_id', referencedColumnName: 'Id' })
  public InventoryUom!: UomOrmEntity;
}
