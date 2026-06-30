import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';

@Index('UQ_locations_warehouse_id_location_code', ['WarehouseId', 'LocationCode'], { unique: true })
@Index(
  'UQ_locations_physical_address_full',
  ['WarehouseId', 'ZoneId', 'AisleCode', 'RackCode', 'LevelCode', 'BinCode'],
  {
    unique: true,
    where:
      '"aisle_code" IS NOT NULL AND "rack_code" IS NOT NULL AND "level_code" IS NOT NULL AND "bin_code" IS NOT NULL',
  },
)
@Entity({ name: 'locations' })
export class LocationOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Index()
  @Column({ name: 'zone_id', type: 'char', length: 36 })
  public ZoneId!: string;

  @Index()
  @Column({ name: 'parent_location_id', type: 'char', length: 36, nullable: true })
  public ParentLocationId!: string | null;

  @Column({ name: 'location_code', type: 'varchar', length: 80 })
  public LocationCode!: string;

  @Column({ name: 'location_name', type: 'varchar', length: 255 })
  public LocationName!: string;

  @Column({ name: 'location_type', type: 'varchar', length: 50 })
  public LocationType!: string;

  @Index()
  @Column({ name: 'location_profile_id', type: 'char', length: 36 })
  public LocationProfileId!: string;

  @Column({ name: 'location_status', type: 'varchar', length: 30 })
  public LocationStatus!: string;

  @Column({ name: 'capacity_qty', type: 'numeric', precision: 18, scale: 3, nullable: true })
  public CapacityQty!: number | string | null;

  @Column({ name: 'capacity_volume', type: 'numeric', precision: 18, scale: 6, nullable: true })
  public CapacityVolume!: number | string | null;

  @Column({ name: 'capacity_weight', type: 'numeric', precision: 18, scale: 3, nullable: true })
  public CapacityWeight!: number | string | null;

  @Column({ name: 'aisle_code', type: 'varchar', length: 50, nullable: true })
  public AisleCode!: string | null;

  @Column({ name: 'rack_code', type: 'varchar', length: 50, nullable: true })
  public RackCode!: string | null;

  @Column({ name: 'level_code', type: 'varchar', length: 50, nullable: true })
  public LevelCode!: string | null;

  @Column({ name: 'bin_code', type: 'varchar', length: 50, nullable: true })
  public BinCode!: string | null;

  @Column({ name: 'pallet_slot', type: 'integer', nullable: true })
  public PalletSlot!: number | null;

  @Column({ name: 'temperature_class', type: 'varchar', length: 50, nullable: true })
  public TemperatureClass!: string | null;

  @Column({ name: 'dg_compatibility_group', type: 'varchar', length: 50, nullable: true })
  public DgCompatibilityGroup!: string | null;

  @Column({ name: 'bonded_flag', type: 'boolean', default: false })
  public BondedFlag!: boolean;

  @Column({ name: 'owner_restriction', type: 'varchar', length: 100, nullable: true })
  public OwnerRestriction!: string | null;

  @Column({ name: 'mix_sku_policy', type: 'varchar', length: 50, nullable: true })
  public MixSkuPolicy!: string | null;

  @Column({ name: 'mix_lot_policy', type: 'varchar', length: 50, nullable: true })
  public MixLotPolicy!: string | null;

  @Column({ name: 'mix_owner_policy', type: 'varchar', length: 50, nullable: true })
  public MixOwnerPolicy!: string | null;

  @Column({ name: 'pick_sequence', type: 'integer', nullable: true })
  public PickSequence!: number | null;

  @Column({ name: 'putaway_sequence', type: 'integer', nullable: true })
  public PutawaySequence!: number | null;

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

  @ManyToOne(() => WarehouseOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', referencedColumnName: 'Id' })
  public Warehouse!: WarehouseOrmEntity;

  @ManyToOne(() => ZoneOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zone_id', referencedColumnName: 'Id' })
  public Zone!: ZoneOrmEntity;

  @ManyToOne(() => LocationProfileOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_profile_id', referencedColumnName: 'Id' })
  public LocationProfile!: LocationProfileOrmEntity;

  @ManyToOne(() => LocationOrmEntity, (location) => location.Children, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_location_id', referencedColumnName: 'Id' })
  public ParentLocation!: LocationOrmEntity | null;

  @OneToMany(() => LocationOrmEntity, (location) => location.ParentLocation)
  public Children!: LocationOrmEntity[];
}
