import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_zones_warehouse_id_zone_code', ['WarehouseId', 'ZoneCode'], { unique: true })
@Entity({ name: 'zones' })
export class ZoneOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'zone_code', type: 'varchar', length: 50 })
  public ZoneCode!: string;

  @Column({ name: 'zone_name', type: 'varchar', length: 255 })
  public ZoneName!: string;

  @Column({ name: 'zone_type', type: 'varchar', length: 50 })
  public ZoneType!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'sequence', type: 'integer', nullable: true })
  public Sequence!: number | null;

  @Column({ name: 'temperature_class', type: 'varchar', length: 50, nullable: true })
  public TemperatureClass!: string | null;

  @Column({ name: 'compliance_flags', type: 'jsonb', default: () => "'{}'::jsonb" })
  public ComplianceFlags!: Record<string, unknown>;

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
}
