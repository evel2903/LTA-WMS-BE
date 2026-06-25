import { IntegrationReconciliationRunStatus } from '@modules/Integration/Domain/Enums/IntegrationReconciliationRunStatus';

export class IntegrationReconciliationRunEntity {
  public readonly Id: string;
  public BusinessReference: string;
  public WarehouseId: string;
  public OwnerId: string | null;
  public RunStatus: IntegrationReconciliationRunStatus;
  public SourceCounts: Record<string, number>;
  public ItemCount: number;
  public MismatchCount: number;
  public ExceptionCount: number;
  public IdempotencyKey: string;
  public RequestPayloadHash: string;
  public ReasonCode: string;
  public ReasonCodeId: string | null;
  public ReasonNote: string | null;
  public EvidenceRefs: string[];
  public ResolvedAt: Date | null;
  public ResolvedBy: string | null;
  public readonly CreatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedAt: Date;

  constructor(params: {
    Id: string;
    BusinessReference: string;
    WarehouseId: string;
    OwnerId?: string | null;
    RunStatus: IntegrationReconciliationRunStatus;
    SourceCounts?: Record<string, number>;
    ItemCount?: number;
    MismatchCount?: number;
    ExceptionCount?: number;
    IdempotencyKey: string;
    RequestPayloadHash: string;
    ReasonCode: string;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    EvidenceRefs?: string[];
    ResolvedAt?: Date | null;
    ResolvedBy?: string | null;
    CreatedAt: Date;
    CreatedBy?: string | null;
    UpdatedAt: Date;
  }) {
    this.Id = params.Id;
    this.BusinessReference = params.BusinessReference;
    this.WarehouseId = params.WarehouseId;
    this.OwnerId = params.OwnerId ?? null;
    this.RunStatus = params.RunStatus;
    this.SourceCounts = params.SourceCounts ?? {};
    this.ItemCount = params.ItemCount ?? 0;
    this.MismatchCount = params.MismatchCount ?? 0;
    this.ExceptionCount = params.ExceptionCount ?? 0;
    this.IdempotencyKey = params.IdempotencyKey;
    this.RequestPayloadHash = params.RequestPayloadHash;
    this.ReasonCode = params.ReasonCode;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? [];
    this.ResolvedAt = params.ResolvedAt ?? null;
    this.ResolvedBy = params.ResolvedBy ?? null;
    this.CreatedAt = params.CreatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedAt = params.UpdatedAt;
  }
}
