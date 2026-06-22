import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MobileTaskOrmEntity } from '@modules/TaskExecution/Infrastructure/Persistence/Entities/MobileTaskOrmEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';

@Entity({ name: 'mobile_scan_events' })
@Index('IDX_mobile_scan_events_task_time', ['TaskId', 'CreatedAt'])
@Index('IDX_mobile_scan_events_raw_value', ['RawValue'])
export class MobileScanEventOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'task_id', type: 'char', length: 36 })
  public TaskId!: string;

  @Column({ name: 'task_code', type: 'varchar', length: 60 })
  public TaskCode!: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'scan_type', type: 'varchar', length: 30 })
  public ScanType!: MobileScanType;

  @Column({ name: 'raw_value', type: 'varchar', length: 240 })
  public RawValue!: string;

  @Column({ name: 'normalized_value', type: 'varchar', length: 240, nullable: true })
  public NormalizedValue!: string | null;

  @Column({ name: 'result', type: 'varchar', length: 40 })
  public Result!: MobileScanResult;

  @Column({ name: 'resolved_object_type', type: 'varchar', length: 60, nullable: true })
  public ResolvedObjectType!: string | null;

  @Column({ name: 'resolved_object_id', type: 'char', length: 36, nullable: true })
  public ResolvedObjectId!: string | null;

  @Column({ name: 'parsed_value_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  public ParsedValueJson!: Record<string, unknown>;

  @Column({ name: 'rejection_code', type: 'varchar', length: 80, nullable: true })
  public RejectionCode!: string | null;

  @Column({ name: 'rejection_message', type: 'varchar', length: 255, nullable: true })
  public RejectionMessage!: string | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 64, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'device_code', type: 'varchar', length: 80, nullable: true })
  public DeviceCode!: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 120, nullable: true })
  public SessionId!: string | null;

  @Column({ name: 'actor_user_id', type: 'char', length: 36, nullable: true })
  public ActorUserId!: string | null;

  @Column({ name: 'created_at', type: 'timestamp with time zone' })
  public CreatedAt!: Date;

  @ManyToOne(() => MobileTaskOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id', referencedColumnName: 'Id' })
  public Task!: MobileTaskOrmEntity;
}
