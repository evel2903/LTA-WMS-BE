import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

@Unique('UQ_inventory_statuses_status_code', ['StatusCode'])
@Entity({ name: 'inventory_statuses' })
export class InventoryStatusOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'status_code', type: 'varchar', length: 50 })
  public StatusCode!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  public DisplayName!: string;

  @Column({ name: 'stage_group', type: 'varchar', length: 100 })
  public StageGroup!: string;

  @Column({ name: 'allows_allocation', type: 'boolean', default: false })
  public AllowsAllocation!: boolean;

  @Column({ name: 'allows_pick', type: 'boolean', default: false })
  public AllowsPick!: boolean;

  @Column({ name: 'is_terminal', type: 'boolean', default: false })
  public IsTerminal!: boolean;

  @Column({ name: 'is_milestone', type: 'boolean', default: false })
  public IsMilestone!: boolean;

  @Column({ name: 'sort_order', type: 'integer' })
  public SortOrder!: number;

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
