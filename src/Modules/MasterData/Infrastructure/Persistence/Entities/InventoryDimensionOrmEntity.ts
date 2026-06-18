import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';

@Unique('UQ_inventory_dimensions_dimension_key_hash', ['DimensionKeyHash'])
@Entity({ name: 'inventory_dimensions' })
export class InventoryDimensionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Index()
  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Index()
  @Column({ name: 'location_id', type: 'char', length: 36 })
  public LocationId!: string;

  @Index()
  @Column({ name: 'inventory_status_id', type: 'char', length: 36 })
  public InventoryStatusId!: string;

  @Column({ name: 'dimension_key_hash', type: 'char', length: 64 })
  public DimensionKeyHash!: string;

  @Index()
  @Column({ name: 'uom_id', type: 'char', length: 36, nullable: true })
  public UomId!: string | null;

  @Column({ name: 'lpn_code', type: 'varchar', length: 100, nullable: true })
  public LpnCode!: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 100, nullable: true })
  public LotNumber!: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  public ExpiryDate!: Date | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  public SerialNumber!: string | null;

  @Column({ name: 'production_date', type: 'date', nullable: true })
  public ProductionDate!: Date | null;

  @Column({ name: 'country_of_origin', type: 'varchar', length: 50, nullable: true })
  public CountryOfOrigin!: string | null;

  @Column({ name: 'customs_status', type: 'varchar', length: 50, nullable: true })
  public CustomsStatus!: string | null;

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

  @ManyToOne(() => OwnerOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id', referencedColumnName: 'Id' })
  public Owner!: OwnerOrmEntity;

  @ManyToOne(() => SkuOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sku_id', referencedColumnName: 'Id' })
  public Sku!: SkuOrmEntity;

  @ManyToOne(() => WarehouseOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', referencedColumnName: 'Id' })
  public Warehouse!: WarehouseOrmEntity;

  @ManyToOne(() => LocationOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id', referencedColumnName: 'Id' })
  public Location!: LocationOrmEntity;

  @ManyToOne(() => InventoryStatusOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventory_status_id', referencedColumnName: 'Id' })
  public InventoryStatus!: InventoryStatusOrmEntity;

  @ManyToOne(() => UomOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uom_id', referencedColumnName: 'Id' })
  public Uom!: UomOrmEntity | null;
}
