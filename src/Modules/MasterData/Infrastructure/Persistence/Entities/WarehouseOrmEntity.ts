import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'warehouses' })
export class WarehouseOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'site_id', type: 'char', length: 36 })
  public SiteId!: string;

  @Index({ unique: true })
  @Column({ name: 'warehouse_code', type: 'varchar', length: 50 })
  public WarehouseCode!: string;

  @Column({ name: 'warehouse_name', type: 'varchar', length: 255 })
  public WarehouseName!: string;

  @Column({ name: 'warehouse_type_code', type: 'varchar', length: 50 })
  public WarehouseTypeCode!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'timezone', type: 'varchar', length: 100, nullable: true })
  public Timezone!: string | null;

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
