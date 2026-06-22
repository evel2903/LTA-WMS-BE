import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';

@Index('UQ_core_flow_business_reference_owner', ['BusinessReference', 'WarehouseCode', 'OwnerCode'], {
  unique: true,
  where: '"owner_code" IS NOT NULL',
})
@Index('UQ_core_flow_business_reference_no_owner', ['BusinessReference', 'WarehouseCode'], {
  unique: true,
  where: '"owner_code" IS NULL',
})
@Entity({ name: 'core_flow_instances' })
export class CoreFlowInstanceOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'business_reference', type: 'varchar', length: 100 })
  public BusinessReference!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 100 })
  public SourceSystem!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 100 })
  public WarehouseCode!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 100, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 100 })
  public CorrelationId!: string;

  @Column({ name: 'current_stage', type: 'varchar', length: 30 })
  public CurrentStage!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  public Metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;

  @OneToMany(() => WorkflowMilestoneOrmEntity, (milestone) => milestone.CoreFlowInstance)
  public Milestones!: WorkflowMilestoneOrmEntity[];

  @OneToMany(() => WorkflowHandoffOrmEntity, (handoff) => handoff.CoreFlowInstance)
  public Handoffs!: WorkflowHandoffOrmEntity[];
}
