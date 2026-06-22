import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

@Entity({ name: 'label_templates' })
@Index('UQ_label_templates_template_code', ['TemplateCode'], { unique: true })
@Index('IDX_label_templates_type_status', ['LabelType', 'Status'])
export class LabelTemplateOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'template_code', type: 'varchar', length: 80 })
  public TemplateCode!: string;

  @Column({ name: 'template_name', type: 'varchar', length: 160 })
  public TemplateName!: string;

  @Column({ name: 'label_type', type: 'varchar', length: 50 })
  public LabelType!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: LabelTemplateStatus;

  @Column({ name: 'required_fields', type: 'jsonb' })
  public RequiredFields!: string[];

  @Column({ name: 'template_body', type: 'text' })
  public TemplateBody!: string;

  @Column({ name: 'active_version_id', type: 'char', length: 36, nullable: true })
  public ActiveVersionId!: string | null;

  @Column({ name: 'created_at', type: 'timestamp with time zone' })
  public CreatedAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp with time zone' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
