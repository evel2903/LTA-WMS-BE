import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';

@Index('IDX_workflow_milestones_instance_step', ['CoreFlowInstanceId', 'StepCode'])
@Entity({ name: 'workflow_milestones' })
export class WorkflowMilestoneOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'core_flow_instance_id', type: 'char', length: 36 })
  public CoreFlowInstanceId!: string;

  @Column({ name: 'stage_code', type: 'varchar', length: 30 })
  public StageCode!: string;

  @Column({ name: 'step_code', type: 'varchar', length: 60 })
  public StepCode!: string;

  @Column({ name: 'milestone_status', type: 'varchar', length: 30 })
  public MilestoneStatus!: string;

  @Column({ name: 'inventory_status_code', type: 'varchar', length: 60, nullable: true })
  public InventoryStatusCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 500, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'exception_case_id', type: 'char', length: 36, nullable: true })
  public ExceptionCaseId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  public Metadata!: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  public OccurredAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @ManyToOne(() => CoreFlowInstanceOrmEntity, (instance) => instance.Milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'core_flow_instance_id' })
  public CoreFlowInstance!: CoreFlowInstanceOrmEntity;
}
