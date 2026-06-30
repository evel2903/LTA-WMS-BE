import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

@Unique('UQ_warehouse_types_warehouse_type_code', ['WarehouseTypeCode'])
@Entity({ name: 'warehouse_types' })
export class WarehouseTypeOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'warehouse_type_code', type: 'varchar', length: 50 })
  public WarehouseTypeCode!: string;

  @Column({ name: 'warehouse_type_name', type: 'varchar', length: 255 })
  public WarehouseTypeName!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  public Description!: string | null;

  @Index()
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
}
