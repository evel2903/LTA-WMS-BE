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
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';

@Index('UQ_sku_barcodes_owner_barcode_value', ['OwnerId', 'BarcodeValue'], {
  unique: true,
  where: `"owner_id" IS NOT NULL`,
})
@Index('UQ_sku_barcodes_global_barcode_value', ['BarcodeValue'], {
  unique: true,
  where: `"owner_id" IS NULL`,
})
@Entity({ name: 'sku_barcodes' })
export class SkuBarcodeOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Index()
  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Index()
  @Column({ name: 'uom_id', type: 'char', length: 36 })
  public UomId!: string;

  @Column({ name: 'pack_code', type: 'varchar', length: 50, nullable: true })
  public PackCode!: string | null;

  @Column({ name: 'barcode_value', type: 'varchar', length: 120 })
  public BarcodeValue!: string;

  @Column({ name: 'barcode_type', type: 'varchar', length: 30 })
  public BarcodeType!: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  public IsPrimary!: boolean;

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

  @ManyToOne(() => OwnerOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id', referencedColumnName: 'Id' })
  public Owner!: OwnerOrmEntity | null;

  @ManyToOne(() => UomOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uom_id', referencedColumnName: 'Id' })
  public Uom!: UomOrmEntity;
}
