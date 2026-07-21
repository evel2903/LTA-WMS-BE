import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_receiving_sessions_plan_key', ['InboundPlanId', 'SessionKey'], { unique: true })
@Index('UQ_receiving_sessions_receipt_key', ['ReceiptId', 'SessionKey'], { unique: true })
@Index('IDX_receiving_sessions_receipt', ['ReceiptId'])
@Entity({ name: 'receiving_sessions' })
export class ReceivingSessionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'inbound_plan_id', type: 'char', length: 36, nullable: true })
  public InboundPlanId!: string | null;

  @Column({ name: 'receipt_id', type: 'char', length: 36 })
  public ReceiptId!: string;

  @Column({ name: 'session_key', type: 'varchar', length: 120 })
  public SessionKey!: string;

  @Column({ name: 'device_code', type: 'varchar', length: 80, nullable: true })
  public DeviceCode!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  public StartedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  public ClosedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'started_by', type: 'char', length: 36, nullable: true })
  public StartedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
