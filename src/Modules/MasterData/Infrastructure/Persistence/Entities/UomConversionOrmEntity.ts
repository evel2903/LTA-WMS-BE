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

@Index('UQ_uom_conversions_sku_from_to_effective', ['SkuId', 'FromUomId', 'ToUomId', 'EffectiveFrom'], { unique: true })
@Entity({ name: 'uom_conversions' })
export class UomConversionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Index()
  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Index()
  @Column({ name: 'from_uom_id', type: 'char', length: 36 })
  public FromUomId!: string;

  @Index()
  @Column({ name: 'to_uom_id', type: 'char', length: 36 })
  public ToUomId!: string;

  @Column({ name: 'factor', type: 'numeric', precision: 18, scale: 6 })
  public Factor!: number;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  public EffectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  public EffectiveTo!: Date | null;

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
  @JoinColumn({ name: 'from_uom_id', referencedColumnName: 'Id' })
  public FromUom!: UomOrmEntity;

  @ManyToOne(() => UomOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_uom_id', referencedColumnName: 'Id' })
  public ToUom!: UomOrmEntity;
}
