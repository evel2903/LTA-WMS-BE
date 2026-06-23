import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { CycleCountWorkStatus } from '@modules/InventoryExecution/Domain/Enums/CycleCountWorkStatus';

@Index('IDX_cycle_count_works_scope_status', ['WarehouseId', 'OwnerId', 'WorkStatus'])
@Index('IDX_cycle_count_works_source_balance', ['SourceBalanceId'])
@Index('IDX_cycle_count_works_locked_balance', ['LockedBalanceId'])
@Index('UQ_cycle_count_works_create_idempotency', ['CreateIdempotencyKey'], { unique: true })
@Entity({ name: 'cycle_count_works' })
export class CycleCountWorkOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'count_code', type: 'varchar', length: 80, unique: true })
  public CountCode!: string;

  @Column({ name: 'work_status', type: 'varchar', length: 40 })
  public WorkStatus!: CycleCountWorkStatus;

  @Column({ name: 'source_balance_id', type: 'char', length: 36 })
  public SourceBalanceId!: string;

  @Column({ name: 'locked_balance_id', type: 'char', length: 36, nullable: true })
  public LockedBalanceId!: string | null;

  @Column({ name: 'original_inventory_status_code', type: 'varchar', length: 80 })
  public OriginalInventoryStatusCode!: string;

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

  @Column({ name: 'location_id', type: 'char', length: 36 })
  public LocationId!: string;

  @Column({ name: 'location_code', type: 'varchar', length: 80, nullable: true })
  public LocationCode!: string | null;

  @Column({ name: 'uom_id', type: 'char', length: 36, nullable: true })
  public UomId!: string | null;

  @Column({ name: 'uom_code', type: 'varchar', length: 40, nullable: true })
  public UomCode!: string | null;

  @Column({ name: 'lpn_code', type: 'varchar', length: 80, nullable: true })
  public LpnCode!: string | null;

  @Column({ name: 'expected_quantity', type: 'numeric', precision: 18, scale: 4 })
  public ExpectedQuantity!: number;

  @Column({ name: 'counted_quantity', type: 'numeric', precision: 18, scale: 4, nullable: true })
  public CountedQuantity!: number | null;

  @Column({ name: 'variance_quantity', type: 'numeric', precision: 18, scale: 4, nullable: true })
  public VarianceQuantity!: number | null;

  @Column({ name: 'tolerance_quantity', type: 'numeric', precision: 18, scale: 4, default: 0 })
  public ToleranceQuantity!: number;

  @Column({ name: 'approval_request_id', type: 'char', length: 36, nullable: true })
  public ApprovalRequestId!: string | null;

  @Column({ name: 'lock_transaction_id', type: 'char', length: 36, nullable: true })
  public LockTransactionId!: string | null;

  @Column({ name: 'submit_idempotency_key', type: 'varchar', length: 160, nullable: true })
  public SubmitIdempotencyKey!: string | null;

  @Column({ name: 'submit_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public SubmitPayloadFingerprint!: string | null;

  @Column({ name: 'adjustment_transaction_id', type: 'char', length: 36, nullable: true })
  public AdjustmentTransactionId!: string | null;

  @Column({ name: 'adjustment_idempotency_key', type: 'varchar', length: 160, nullable: true })
  public AdjustmentIdempotencyKey!: string | null;

  @Column({ name: 'adjustment_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public AdjustmentPayloadFingerprint!: string | null;

  @Column({ name: 'unlock_transaction_id', type: 'char', length: 36, nullable: true })
  public UnlockTransactionId!: string | null;

  @Column({ name: 'unlock_idempotency_key', type: 'varchar', length: 160, nullable: true })
  public UnlockIdempotencyKey!: string | null;

  @Column({ name: 'unlock_payload_fingerprint', type: 'varchar', length: 64, nullable: true })
  public UnlockPayloadFingerprint!: string | null;

  @Column({ name: 'create_idempotency_key', type: 'varchar', length: 160 })
  public CreateIdempotencyKey!: string;

  @Column({ name: 'create_payload_fingerprint', type: 'varchar', length: 64 })
  public CreatePayloadFingerprint!: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 80, nullable: true })
  public ReasonCode!: string | null;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => `'[]'::jsonb` })
  public EvidenceRefs!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
