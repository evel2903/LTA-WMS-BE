import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_uoms_uom_code', ['UomCode'], { unique: true })
@Entity({ name: 'uoms' })
export class UomOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'uom_code', type: 'varchar', length: 50 })
  public UomCode!: string;

  @Column({ name: 'uom_name', type: 'varchar', length: 255 })
  public UomName!: string;

  @Column({ name: 'uom_type', type: 'varchar', length: 50, default: 'Quantity' })
  public UomType!: string;

  @Column({ name: 'decimal_precision', type: 'integer', default: 0 })
  public DecimalPrecision!: number;

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
