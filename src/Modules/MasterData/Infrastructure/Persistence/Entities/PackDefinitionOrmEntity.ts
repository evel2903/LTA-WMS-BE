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
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';

@Index('UQ_pack_definitions_sku_pack_code', ['SkuId', 'PackCode'], { unique: true })
@Index('UQ_pack_definitions_active_default_sku', ['SkuId'], {
  unique: true,
  where: `"is_default" = true AND "status" = 'Active'`,
})
@Entity({ name: 'pack_definitions' })
export class PackDefinitionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Column({ name: 'pack_code', type: 'varchar', length: 50 })
  public PackCode!: string;

  @Column({ name: 'pack_name', type: 'varchar', length: 255 })
  public PackName!: string;

  @Index()
  @Column({ name: 'uom_id', type: 'char', length: 36 })
  public UomId!: string;

  @Column({ name: 'quantity_per_pack', type: 'numeric', precision: 18, scale: 6 })
  public QuantityPerPack!: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  public IsDefault!: boolean;

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

  @ManyToOne(() => UomOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uom_id', referencedColumnName: 'Id' })
  public Uom!: UomOrmEntity;
}
