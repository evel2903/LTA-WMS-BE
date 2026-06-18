import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';

@Unique('UQ_inventory_balances_dimension_id', ['DimensionId'])
@Entity({ name: 'inventory_balances' })
export class InventoryBalanceOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'dimension_id', type: 'char', length: 36 })
  public DimensionId!: string;

  @Column({ name: 'qty_on_hand', type: 'numeric', precision: 18, scale: 6, default: 0 })
  public QtyOnHand!: number;

  @Column({ name: 'qty_reserved', type: 'numeric', precision: 18, scale: 6, default: 0 })
  public QtyReserved!: number;

  @Column({ name: 'qty_available', type: 'numeric', precision: 18, scale: 6, default: 0 })
  public QtyAvailable!: number;

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

  @ManyToOne(() => InventoryDimensionOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'dimension_id', referencedColumnName: 'Id' })
  public Dimension!: InventoryDimensionOrmEntity;
}
