import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OutboundOrderOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderOrmEntity';

@Index('IDX_outbound_order_lines_order', ['OutboundOrderId'])
@Index('UQ_outbound_order_lines_order_line', ['OutboundOrderId', 'LineNumber'], { unique: true })
@Entity({ name: 'outbound_order_lines' })
export class OutboundOrderLineOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'line_number', type: 'integer' })
  public LineNumber!: number;

  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Column({ name: 'sku_code', type: 'varchar', length: 80, nullable: true })
  public SkuCode!: string | null;

  @Column({ name: 'uom_id', type: 'char', length: 36 })
  public UomId!: string;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'ordered_quantity', type: 'numeric', precision: 18, scale: 4 })
  public OrderedQuantity!: number;

  @Column({ name: 'external_line_reference', type: 'varchar', length: 120, nullable: true })
  public ExternalLineReference!: string | null;

  @Column({ name: 'requested_lot_number', type: 'varchar', length: 100, nullable: true })
  public RequestedLotNumber!: string | null;

  @Column({ name: 'requested_serial_number', type: 'varchar', length: 100, nullable: true })
  public RequestedSerialNumber!: string | null;

  @Column({ name: 'validation_errors', type: 'jsonb', default: () => `'[]'::jsonb` })
  public ValidationErrors!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @ManyToOne(() => OutboundOrderOrmEntity, (order) => order.Lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'outbound_order_id' })
  public OutboundOrder!: OutboundOrderOrmEntity;
}
