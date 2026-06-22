import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

@Entity({ name: 'mobile_tasks' })
@Index('IDX_mobile_tasks_scope_status_type', ['WarehouseId', 'TaskStatus', 'TaskType'])
@Index('IDX_mobile_tasks_assignee_status', ['AssignedUserId', 'TaskStatus'])
export class MobileTaskOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'task_code', type: 'varchar', length: 60, unique: true })
  public TaskCode!: string;

  @Column({ name: 'task_type', type: 'varchar', length: 30 })
  public TaskType!: MobileTaskType;

  @Column({ name: 'task_status', type: 'varchar', length: 30 })
  public TaskStatus!: MobileTaskStatus;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 60, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'owner_code', type: 'varchar', length: 60, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'source_document_type', type: 'varchar', length: 60 })
  public SourceDocumentType!: string;

  @Column({ name: 'source_document_id', type: 'char', length: 36 })
  public SourceDocumentId!: string;

  @Column({ name: 'source_document_code', type: 'varchar', length: 100, nullable: true })
  public SourceDocumentCode!: string | null;

  @Column({ name: 'priority', type: 'integer' })
  public Priority!: number;

  @Column({ name: 'assigned_user_id', type: 'char', length: 36, nullable: true })
  public AssignedUserId!: string | null;

  @Column({ name: 'claimed_at', type: 'timestamp with time zone', nullable: true })
  public ClaimedAt!: Date | null;

  @Column({ name: 'released_at', type: 'timestamp with time zone', nullable: true })
  public ReleasedAt!: Date | null;

  @Column({ name: 'due_at', type: 'timestamp with time zone', nullable: true })
  public DueAt!: Date | null;

  @Column({ name: 'device_code', type: 'varchar', length: 80, nullable: true })
  public DeviceCode!: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 120, nullable: true })
  public SessionId!: string | null;

  @Column({ name: 'task_payload', type: 'jsonb' })
  public TaskPayload!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamp with time zone' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_at', type: 'timestamp with time zone' })
  public UpdatedAt!: Date;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
