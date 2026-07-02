import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Index('UQ_partners_partner_code', ['PartnerCode'], { unique: true })
@Index('UQ_partners_type_source_external_reference', ['PartnerType', 'SourceSystem', 'ExternalReference'], {
  unique: true,
})
@Entity({ name: 'partners' })
export class PartnerOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'partner_code', type: 'varchar', length: 50 })
  public PartnerCode!: string;

  @Column({ name: 'partner_name', type: 'varchar', length: 255 })
  public PartnerName!: string;

  @Column({ name: 'partner_type', type: 'varchar', length: 30 })
  public PartnerType!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: string;

  @Column({ name: 'source_system', type: 'varchar', length: 100 })
  public SourceSystem!: string;

  @Column({ name: 'external_reference', type: 'varchar', length: 100 })
  public ExternalReference!: string;

  @Column({ name: 'reference_text', type: 'varchar', length: 255, nullable: true })
  public ReferenceText!: string | null;

  @Column({ name: 'risk_level', type: 'varchar', length: 20, nullable: true })
  public RiskLevel!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public CreatedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public UpdatedAt!: Date;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  public CreatedBy!: string | null;

  @Column({ name: 'updated_by', type: 'char', length: 36, nullable: true })
  public UpdatedBy!: string | null;
}
