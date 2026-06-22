import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';

@Index('IDX_workflow_handoffs_instance', ['CoreFlowInstanceId'])
@Entity({ name: 'workflow_handoffs' })
export class WorkflowHandoffOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'core_flow_instance_id', type: 'char', length: 36 })
  public CoreFlowInstanceId!: string;

  @Column({ name: 'from_stage', type: 'varchar', length: 30 })
  public FromStage!: string;

  @Column({ name: 'to_stage', type: 'varchar', length: 30 })
  public ToStage!: string;

  @Column({ name: 'handoff_status', type: 'varchar', length: 30 })
  public HandoffStatus!: string;

  @Column({ name: 'blocked_reason', type: 'varchar', length: 500, nullable: true })
  public BlockedReason!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 500, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  public Metadata!: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  public OccurredAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @ManyToOne(() => CoreFlowInstanceOrmEntity, (instance) => instance.Handoffs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'core_flow_instance_id' })
  public CoreFlowInstance!: CoreFlowInstanceOrmEntity;
}
