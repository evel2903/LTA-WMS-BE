import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_shipping_package_staging_package', ['PackageId'], { unique: true })
@Index('UQ_shipping_package_staging_stage_idempotency', ['StageIdempotencyKey'], { unique: true })
@Index('IDX_shipping_package_staging_order_status', ['OutboundOrderId', 'Status'])
@Index('IDX_shipping_package_staging_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Entity({ name: 'shipping_package_staging' })
export class ShipmentPackageStagingOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'staging_code', type: 'varchar', length: 80 })
  public StagingCode!: string;

  @Column({ name: 'package_id', type: 'char', length: 36 })
  public PackageId!: string;

  @Column({ name: 'package_code', type: 'varchar', length: 80 })
  public PackageCode!: string;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'warehouse_profile_id', type: 'char', length: 36 })
  public WarehouseProfileId!: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36, nullable: true })
  public WarehouseId!: string | null;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 50, nullable: true })
  public InventoryStatusCode!: string | null;

  @Column({ name: 'shipment_reference', type: 'varchar', length: 120, nullable: true })
  public ShipmentReference!: string | null;

  @Column({ name: 'staging_lane_code', type: 'varchar', length: 80 })
  public StagingLaneCode!: string;

  @Column({ name: 'staging_location_id', type: 'char', length: 36, nullable: true })
  public StagingLocationId!: string | null;

  @Column({ name: 'staging_location_code', type: 'varchar', length: 80, nullable: true })
  public StagingLocationCode!: string | null;

  @Column({ name: 'dock_door_id', type: 'char', length: 36, nullable: true })
  public DockDoorId!: string | null;

  @Column({ name: 'dock_door_code', type: 'varchar', length: 80, nullable: true })
  public DockDoorCode!: string | null;

  @Column({ name: 'truck_reference', type: 'varchar', length: 120, nullable: true })
  public TruckReference!: string | null;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 80, nullable: true })
  public VehicleNumber!: string | null;

  @Column({ name: 'driver_name', type: 'varchar', length: 120, nullable: true })
  public DriverName!: string | null;

  @Column({ name: 'carrier_id', type: 'char', length: 36, nullable: true })
  public CarrierId!: string | null;

  @Column({ name: 'carrier_code', type: 'varchar', length: 80, nullable: true })
  public CarrierCode!: string | null;

  @Column({ name: 'core_flow_instance_id', type: 'char', length: 36, nullable: true })
  public CoreFlowInstanceId!: string | null;

  @Column({ name: 'stage_idempotency_key', type: 'varchar', length: 180 })
  public StageIdempotencyKey!: string;

  @Column({ name: 'stage_payload_fingerprint', type: 'varchar', length: 64 })
  public StagePayloadFingerprint!: string;

  @Column({ name: 'dock_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public DockIdempotencyKey!: string | null;

  @Column({ name: 'dock_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public DockPayloadFingerprint!: string | null;

  @Column({ name: 'truck_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public TruckIdempotencyKey!: string | null;

  @Column({ name: 'truck_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public TruckPayloadFingerprint!: string | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'staged_at', type: 'timestamptz' })
  public StagedAt!: Date;

  @Column({ name: 'staged_by', type: 'char', length: 36, nullable: true })
  public StagedBy!: string | null;

  @Column({ name: 'dock_assigned_at', type: 'timestamptz', nullable: true })
  public DockAssignedAt!: Date | null;

  @Column({ name: 'dock_assigned_by', type: 'char', length: 36, nullable: true })
  public DockAssignedBy!: string | null;

  @Column({ name: 'truck_assigned_at', type: 'timestamptz', nullable: true })
  public TruckAssignedAt!: Date | null;

  @Column({ name: 'truck_assigned_by', type: 'char', length: 36, nullable: true })
  public TruckAssignedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
