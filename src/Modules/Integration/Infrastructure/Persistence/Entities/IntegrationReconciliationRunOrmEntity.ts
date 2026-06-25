import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { IntegrationReconciliationRunStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationRunStatus';

@Entity('integration_reconciliation_runs')
@Index(
  'ux_integration_reconciliation_runs_scope_idempotency',
  ['BusinessReference', 'WarehouseId', 'OwnerId', 'IdempotencyKey'],
  {
    unique: true,
  },
)
@Index('ix_integration_reconciliation_runs_scope', ['BusinessReference', 'WarehouseId', 'OwnerId'])
export class IntegrationReconciliationRunOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'business_reference', type: 'varchar', length: 120 })
  public BusinessReference!: string;

  @Column({ name: 'warehouse_id', type: 'varchar', length: 100 })
  public WarehouseId!: string;

  @Column({ name: 'owner_id', type: 'varchar', length: 100, default: '' })
  public OwnerId!: string;

  @Column({ name: 'run_status', type: 'varchar', length: 40 })
  public RunStatus!: IntegrationReconciliationRunStatus;

  @Column({ name: 'source_counts', type: 'jsonb', default: () => "'{}'::jsonb" })
  public SourceCounts!: Record<string, number>;

  @Column({ name: 'item_count', type: 'int', default: 0 })
  public ItemCount!: number;

  @Column({ name: 'mismatch_count', type: 'int', default: 0 })
  public MismatchCount!: number;

  @Column({ name: 'exception_count', type: 'int', default: 0 })
  public ExceptionCount!: number;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  public IdempotencyKey!: string;

  @Column({ name: 'request_payload_hash', type: 'varchar', length: 64 })
  public RequestPayloadHash!: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 80 })
  public ReasonCode!: string;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 500, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', default: () => "'[]'::jsonb" })
  public EvidenceRefs!: string[];

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  public ResolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'char', length: 36, nullable: true })
  public ResolvedBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;
}
