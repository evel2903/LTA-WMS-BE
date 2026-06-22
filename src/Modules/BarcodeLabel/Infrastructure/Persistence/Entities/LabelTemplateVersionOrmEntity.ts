import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

@Entity({ name: 'label_template_versions' })
@Index('IDX_label_template_versions_template_status', ['TemplateId', 'Status'])
@Index('UQ_label_template_versions_template_version', ['TemplateId', 'VersionNo'], { unique: true })
export class LabelTemplateVersionOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'template_id', type: 'char', length: 36 })
  public TemplateId!: string;

  @Column({ name: 'version_no', type: 'integer' })
  public VersionNo!: number;

  @Column({ name: 'template_body', type: 'text' })
  public TemplateBody!: string;

  @Column({ name: 'required_fields', type: 'jsonb' })
  public RequiredFields!: string[];

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: LabelTemplateStatus;

  @Column({ name: 'created_at', type: 'timestamp with time zone' })
  public CreatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;
}
