import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';

@Entity({ name: 'print_jobs' })
@Index('UQ_print_jobs_job_code', ['JobCode'], { unique: true })
@Index('IDX_print_jobs_template_status', ['TemplateId', 'Status'])
@Index('IDX_print_jobs_business_object', ['BusinessObjectType', 'BusinessObjectId'])
@Index('IDX_print_jobs_scope_status', ['WarehouseId', 'OwnerId', 'Status'])
export class PrintJobOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'job_code', type: 'varchar', length: 80 })
  public JobCode!: string;

  @Column({ name: 'template_id', type: 'char', length: 36 })
  public TemplateId!: string;

  @Column({ name: 'template_version_id', type: 'char', length: 36 })
  public TemplateVersionId!: string;

  @Column({ name: 'business_object_type', type: 'varchar', length: 80 })
  public BusinessObjectType!: string;

  @Column({ name: 'business_object_id', type: 'varchar', length: 120 })
  public BusinessObjectId!: string;

  @Column({ name: 'business_object_code', type: 'varchar', length: 120, nullable: true })
  public BusinessObjectCode!: string | null;

  @Column({ name: 'warehouse_id', type: 'char', length: 36, nullable: true })
  public WarehouseId!: string | null;

  @Column({ name: 'owner_id', type: 'char', length: 36, nullable: true })
  public OwnerId!: string | null;

  @Column({ name: 'payload_json', type: 'jsonb' })
  public PayloadJson!: Record<string, unknown>;

  @Column({ name: 'preview_content', type: 'text', nullable: true })
  public PreviewContent!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: PrintJobStatus;

  @Column({ name: 'validation_errors', type: 'jsonb', nullable: true })
  public ValidationErrors!: Record<string, unknown> | null;

  @Column({ name: 'reprint_count', type: 'integer' })
  public ReprintCount!: number;

  @Column({ name: 'requested_by', type: 'char', length: 36, nullable: true })
  public RequestedBy!: string | null;

  @Column({ name: 'requested_at', type: 'timestamp with time zone' })
  public RequestedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  public CompletedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp with time zone' })
  public CreatedAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp with time zone' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
