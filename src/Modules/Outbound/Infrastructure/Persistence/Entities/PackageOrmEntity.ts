import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('IDX_outbound_packages_session', ['PackSessionId'])
@Index('IDX_outbound_packages_pick_task', ['PickTaskId'])
@Index('IDX_outbound_packages_order_status', ['OutboundOrderId', 'Status'])
@Index('IDX_outbound_packages_idempotency', ['IdempotencyKey'], { unique: true })
@Entity({ name: 'outbound_packages' })
export class PackageOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'package_code', type: 'varchar', length: 80 })
  public PackageCode!: string;

  @Column({ name: 'pack_session_id', type: 'char', length: 36 })
  public PackSessionId!: string;

  @Column({ name: 'pick_task_id', type: 'char', length: 36 })
  public PickTaskId!: string;

  @Column({ name: 'outbound_order_id', type: 'char', length: 36 })
  public OutboundOrderId!: string;

  @Column({ name: 'warehouse_profile_id', type: 'char', length: 36 })
  public WarehouseProfileId!: string;

  @Column({ name: 'warehouse_id', type: 'char', length: 36, nullable: true })
  public WarehouseId!: string | null;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'check_required', type: 'boolean', default: false })
  public CheckRequired!: boolean;

  @Column({ name: 'check_result', type: 'varchar', length: 40 })
  public CheckResult!: string;

  @Column({ name: 'carton_type', type: 'varchar', length: 80 })
  public CartonType!: string;

  @Column({ name: 'weight', type: 'numeric', precision: 18, scale: 4, nullable: true })
  public Weight!: number | null;

  @Column({ name: 'length', type: 'numeric', precision: 18, scale: 4, nullable: true })
  public Length!: number | null;

  @Column({ name: 'width', type: 'numeric', precision: 18, scale: 4, nullable: true })
  public Width!: number | null;

  @Column({ name: 'height', type: 'numeric', precision: 18, scale: 4, nullable: true })
  public Height!: number | null;

  @Column({ name: 'label_blocking_decision', type: 'varchar', length: 40, nullable: true })
  public LabelBlockingDecision!: string | null;

  @Column({ name: 'label_print_job_id', type: 'char', length: 36, nullable: true })
  public LabelPrintJobId!: string | null;

  @Column({ name: 'label_print_job_code', type: 'varchar', length: 80, nullable: true })
  public LabelPrintJobCode!: string | null;

  @Column({ name: 'ready_for_staging_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public ReadyForStagingIdempotencyKey!: string | null;

  @Column({ name: 'ready_for_staging_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public ReadyForStagingPayloadFingerprint!: string | null;

  @Column({ name: 'close_idempotency_key', type: 'varchar', length: 180, nullable: true })
  public CloseIdempotencyKey!: string | null;

  @Column({ name: 'close_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public ClosePayloadFingerprint!: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  public ClosedAt!: Date | null;

  @Column({ name: 'closed_by', type: 'char', length: 36, nullable: true })
  public ClosedBy!: string | null;

  @Column({ name: 'ready_for_staging_at', type: 'timestamptz', nullable: true })
  public ReadyForStagingAt!: Date | null;

  @Column({ name: 'ready_for_staging_by', type: 'char', length: 36, nullable: true })
  public ReadyForStagingBy!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 180 })
  public IdempotencyKey!: string;

  @Column({ name: 'payload_fingerprint', type: 'varchar', length: 64 })
  public PayloadFingerprint!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
