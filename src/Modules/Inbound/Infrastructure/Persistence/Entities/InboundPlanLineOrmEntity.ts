import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn } from 'typeorm';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';

@Index('IDX_inbound_plan_lines_plan', ['InboundPlanId'])
@Index('UQ_inbound_plan_lines_plan_line', ['InboundPlanId', 'LineNumber'], { unique: true })
@Entity({ name: 'inbound_plan_lines' })
export class InboundPlanLineOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'inbound_plan_id', type: 'char', length: 36 })
  public InboundPlanId!: string;

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

  @Column({ name: 'expected_quantity', type: 'numeric', precision: 18, scale: 4 })
  public ExpectedQuantity!: number;

  @Column({ name: 'external_line_reference', type: 'varchar', length: 100, nullable: true })
  public ExternalLineReference!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @ManyToOne(() => InboundPlanOrmEntity, (plan) => plan.Lines, { onDelete: 'CASCADE' })
  public InboundPlan!: InboundPlanOrmEntity;
}
