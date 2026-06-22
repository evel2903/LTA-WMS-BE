import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';

@Index(
  'UQ_inbound_plans_business_key',
  ['SourceSystem', 'SourceDocumentType', 'SourceDocumentNumber', 'OwnerId', 'WarehouseId'],
  { unique: true },
)
@Index('IDX_inbound_plans_source_status', ['SourceSystem', 'Status'])
@Index('IDX_inbound_plans_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Entity({ name: 'inbound_plans' })
export class InboundPlanOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 100 })
  public SourceSystem!: string;

  @Column({ name: 'source_document_type', type: 'varchar', length: 40 })
  public SourceDocumentType!: string;

  @Column({ name: 'source_document_number', type: 'varchar', length: 100 })
  public SourceDocumentNumber!: string;

  @Column({ name: 'business_reference', type: 'varchar', length: 160 })
  public BusinessReference!: string;

  @Column({ name: 'supplier_id', type: 'char', length: 36 })
  public SupplierId!: string;

  @Column({ name: 'supplier_code', type: 'varchar', length: 80, nullable: true })
  public SupplierCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'warehouse_profile_id', type: 'char', length: 36, nullable: true })
  public WarehouseProfileId!: string | null;

  @Column({ name: 'expected_arrival_at', type: 'timestamptz', nullable: true })
  public ExpectedArrivalAt!: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'gate_in_status', type: 'varchar', length: 30 })
  public GateInStatus!: string;

  @Column({ name: 'gate_in_at', type: 'timestamptz', nullable: true })
  public GateInAt!: Date | null;

  @Column({ name: 'gate_reference', type: 'varchar', length: 100, nullable: true })
  public GateReference!: string | null;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 80, nullable: true })
  public VehicleNumber!: string | null;

  @Column({ name: 'driver_name', type: 'varchar', length: 120, nullable: true })
  public DriverName!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'core_flow_instance_id', type: 'char', length: 36, nullable: true })
  public CoreFlowInstanceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;

  @OneToMany(() => InboundPlanLineOrmEntity, (line) => line.InboundPlan)
  public Lines!: InboundPlanLineOrmEntity[];
}
