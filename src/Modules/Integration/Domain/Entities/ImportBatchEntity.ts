import { ImportBatchStatus } from '@modules/Integration/Domain/Enums/ImportBatchStatus';

export class ImportBatchEntity {
  public Id: string;
  public BatchReference: string | null;
  public SourceSystem: string | null;
  public TargetSystem: string | null;
  public Status: ImportBatchStatus;
  public MessageCount: number;
  public AcceptedCount: number;
  public DuplicateCount: number;
  public RejectedCount: number;
  public CreatedAt: Date;
  public CreatedBy: string | null;

  constructor(params: {
    Id: string;
    BatchReference?: string | null;
    SourceSystem?: string | null;
    TargetSystem?: string | null;
    Status: ImportBatchStatus;
    MessageCount: number;
    AcceptedCount: number;
    DuplicateCount: number;
    RejectedCount?: number;
    CreatedAt?: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.BatchReference = params.BatchReference ?? null;
    this.SourceSystem = params.SourceSystem ?? null;
    this.TargetSystem = params.TargetSystem ?? null;
    this.Status = params.Status;
    this.MessageCount = params.MessageCount;
    this.AcceptedCount = params.AcceptedCount;
    this.DuplicateCount = params.DuplicateCount;
    this.RejectedCount = params.RejectedCount ?? 0;
    this.CreatedAt = params.CreatedAt ?? new Date();
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
