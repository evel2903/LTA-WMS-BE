import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ReceiptLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptLineOrmEntity';

@Index('UQ_receipts_inbound_plan', ['InboundPlanId'], { unique: true })
@Index('UQ_receipts_manual_idempotency', ['OwnerId', 'WarehouseId', 'IdempotencyKey'], {
  unique: true,
  where: '"inbound_plan_id" IS NULL AND "idempotency_key" IS NOT NULL',
})
@Index('UQ_receipts_manual_number', ['OwnerId', 'WarehouseId', 'ReceiptNumber'], {
  unique: true,
  where: '"inbound_plan_id" IS NULL',
})
@Index('IDX_receipts_owner_warehouse', ['OwnerId', 'WarehouseId'])
@Entity({ name: 'receipts' })
export class ReceiptOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'inbound_plan_id', type: 'char', length: 36, nullable: true })
  public InboundPlanId!: string | null;

  @Column({ name: 'receipt_number', type: 'varchar', length: 120 })
  public ReceiptNumber!: string;

  @Column({ name: 'business_reference', type: 'varchar', length: 180 })
  public BusinessReference!: string;

  @Column({ name: 'owner_id', type: 'char', length: 36 })
  public OwnerId!: string;

  @Column({ name: 'owner_code', type: 'varchar', length: 80, nullable: true })
  public OwnerCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36 })
  public WarehouseId!: string;

  @Column({ name: 'warehouse_code', type: 'varchar', length: 80, nullable: true })
  public WarehouseCode!: string | null;

  @Column({ name: 'warehouse_profile_id', type: 'char', length: 36, nullable: true })
  public WarehouseProfileId!: string | null;

  @Column({ name: 'supplier_id', type: 'char', length: 36 })
  public SupplierId!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160, nullable: true })
  public IdempotencyKey!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  public Status!: string;

  @Column({ name: 'core_flow_instance_id', type: 'char', length: 36, nullable: true })
  public CoreFlowInstanceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;

  @OneToMany(() => ReceiptLineOrmEntity, (line) => line.Receipt)
  public Lines!: ReceiptLineOrmEntity[];
}
