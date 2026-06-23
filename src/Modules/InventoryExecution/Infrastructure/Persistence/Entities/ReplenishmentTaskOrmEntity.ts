import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ReplenishmentTaskStatus } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTaskStatus';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';

@Index('IDX_replenishment_tasks_scope_status', ['WarehouseId', 'OwnerId', 'TaskStatus'])
@Index('IDX_replenishment_tasks_source_balance', ['SourceBalanceId'])
@Index('IDX_replenishment_tasks_target_location', ['TargetLocationId'])
@Index('UQ_replenishment_tasks_release_idempotency', ['ReleaseIdempotencyKey'], { unique: true })
@Entity({ name: 'replenishment_tasks' })
export class ReplenishmentTaskOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'task_code', type: 'varchar', length: 80, unique: true })
  public TaskCode!: string;

  @Column({ name: 'task_status', type: 'varchar', length: 40 })
  public TaskStatus!: ReplenishmentTaskStatus;

  @Column({ name: 'trigger_type', type: 'varchar', length: 40 })
  public TriggerType!: ReplenishmentTriggerType;

  @Column({ name: 'source_balance_id', type: 'char', length: 36 })
  public SourceBalanceId!: string;

  @Column({ name: 'source_dimension_id', type: 'char', length: 36 })
  public SourceDimensionId!: string;

  @Column({ name: 'source_location_id', type: 'char', length: 36 })
  public SourceLocationId!: string;

  @Column({ name: 'source_location_code', type: 'varchar', length: 80, nullable: true })
  public SourceLocationCode!: string | null;

  @Column({ name: 'source_inventory_status_code', type: 'varchar', length: 80 })
  public SourceInventoryStatusCode!: string;

  @Column({ name: 'target_location_id', type: 'char', length: 36 })
  public TargetLocationId!: string;

  @Column({ name: 'target_location_code', type: 'varchar', length: 80, nullable: true })
  public TargetLocationCode!: string | null;

  @Column({ name: 'target_location_profile_id', type: 'char', length: 36, nullable: true })
  public TargetLocationProfileId!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'sku_id', type: 'char', length: 36 })
  public SkuId!: string;

  @Column({ name: 'sku_code', type: 'varchar', length: 80, nullable: true })
  public SkuCode!: string | null;

  @Column({ name: 'uom_id', type: 'char', length: 36, nullable: true })
  public UomId!: string | null;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 4 })
  public Quantity!: number;

  @Column({ name: 'short_pick_reference', type: 'varchar', length: 160, nullable: true })
  public ShortPickReference!: string | null;

  @Column({ name: 'priority', type: 'int', nullable: true })
  public Priority!: number | null;

  @Column({ name: 'work_pool_code', type: 'varchar', length: 80, nullable: true })
  public WorkPoolCode!: string | null;

  @Column({ name: 'assigned_user_id', type: 'char', length: 36, nullable: true })
  public AssignedUserId!: string | null;

  @Column({ name: 'eligibility_decision_json', type: 'jsonb', nullable: true })
  public EligibilityDecisionJson!: Record<string, unknown> | null;

  @Column({ name: 'outbox_message_id', type: 'char', length: 36, nullable: true })
  public OutboxMessageId!: string | null;

  @Column({ name: 'confirm_transaction_id', type: 'char', length: 36, nullable: true })
  public ConfirmTransactionId!: string | null;

  @Column({ name: 'confirm_movement_id', type: 'char', length: 36, nullable: true })
  public ConfirmMovementId!: string | null;

  @Column({ name: 'confirm_outbox_message_id', type: 'char', length: 36, nullable: true })
  public ConfirmOutboxMessageId!: string | null;

  @Column({ name: 'release_idempotency_key', type: 'varchar', length: 160 })
  public ReleaseIdempotencyKey!: string;

  @Column({ name: 'release_payload_fingerprint', type: 'varchar', length: 64 })
  public ReleasePayloadFingerprint!: string;

  @Column({ name: 'confirm_idempotency_key', type: 'varchar', length: 160, nullable: true })
  public ConfirmIdempotencyKey!: string | null;

  @Column({ name: 'confirm_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public ConfirmPayloadFingerprint!: string | null;

  @Column({ name: 'cancel_idempotency_key', type: 'varchar', length: 160, nullable: true })
  public CancelIdempotencyKey!: string | null;

  @Column({ name: 'cancel_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public CancelPayloadFingerprint!: string | null;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  public ReleasedAt!: Date | null;

  @Column({ name: 'released_by', type: 'char', length: 36, nullable: true })
  public ReleasedBy!: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  public ConfirmedAt!: Date | null;

  @Column({ name: 'confirmed_by', type: 'char', length: 36, nullable: true })
  public ConfirmedBy!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  public CancelledAt!: Date | null;

  @Column({ name: 'cancelled_by', type: 'char', length: 36, nullable: true })
  public CancelledBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
