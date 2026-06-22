import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { ReprintRequestStatus } from '@modules/BarcodeLabel/Domain/Enums/ReprintRequestStatus';

@Entity({ name: 'reprint_requests' })
@Index('UQ_reprint_requests_print_job_sequence', ['OriginalPrintJobId', 'ReprintSequence'], { unique: true })
export class ReprintRequestOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36 })
  public Id!: string;

  @Column({ name: 'original_print_job_id', type: 'char', length: 36 })
  public OriginalPrintJobId!: string;

  @Column({ name: 'reprint_sequence', type: 'integer' })
  public ReprintSequence!: number;

  @Column({ name: 'reason_code', type: 'varchar', length: 80 })
  public ReasonCode!: string;

  @Column({ name: 'reason_code_id', type: 'char', length: 36, nullable: true })
  public ReasonCodeId!: string | null;

  @Column({ name: 'reason_note', type: 'varchar', length: 500, nullable: true })
  public ReasonNote!: string | null;

  @Column({ name: 'evidence_refs', type: 'jsonb', nullable: true })
  public EvidenceRefs!: string[] | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  public Status!: ReprintRequestStatus;

  @Column({ name: 'requested_by', type: 'char', length: 36, nullable: true })
  public RequestedBy!: string | null;

  @Column({ name: 'requested_at', type: 'timestamp with time zone' })
  public RequestedAt!: Date;
}
