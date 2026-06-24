import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';

export interface OutboundActionIdempotencyRecord {
  Action: string;
  Fingerprint: string;
  DocumentStatus: OutboundOrderStatus;
  OutboxMessageId: string | null;
  AppliedAt: string;
}

export class OutboundOrderEntity {
  public readonly Id: string;
  public OrderNumber: string;
  public SourceSystem: string;
  public SourceReference: string;
  public BusinessReference: string;
  public CustomerId: string | null;
  public CustomerSourceSystem: string | null;
  public CustomerExternalReference: string | null;
  public CustomerCode: string | null;
  public ShipToReference: string | null;
  public OwnerId: string;
  public OwnerCode: string | null;
  public WarehouseId: string;
  public WarehouseCode: string | null;
  public Priority: number | null;
  public CutoffAt: Date | null;
  public DocumentStatus: OutboundOrderStatus;
  public ValidationErrors: string[];
  public CoreFlowInstanceId: string | null;
  public OutboxMessageId: string | null;
  public ImportIdempotencyKey: string;
  public ImportPayloadFingerprint: string;
  public ReasonCode: string | null;
  public ReasonCodeId: string | null;
  public ReasonNote: string | null;
  public EvidenceRefs: string[];
  public ActionIdempotency: Record<string, OutboundActionIdempotencyRecord>;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    OrderNumber: string;
    SourceSystem: string;
    SourceReference: string;
    BusinessReference: string;
    CustomerId?: string | null;
    CustomerSourceSystem?: string | null;
    CustomerExternalReference?: string | null;
    CustomerCode?: string | null;
    ShipToReference?: string | null;
    OwnerId: string;
    OwnerCode?: string | null;
    WarehouseId: string;
    WarehouseCode?: string | null;
    Priority?: number | null;
    CutoffAt?: Date | null;
    DocumentStatus: OutboundOrderStatus;
    ValidationErrors?: string[];
    CoreFlowInstanceId?: string | null;
    OutboxMessageId?: string | null;
    ImportIdempotencyKey: string;
    ImportPayloadFingerprint: string;
    ReasonCode?: string | null;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    EvidenceRefs?: string[];
    ActionIdempotency?: Record<string, OutboundActionIdempotencyRecord>;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.OrderNumber = params.OrderNumber;
    this.SourceSystem = params.SourceSystem;
    this.SourceReference = params.SourceReference;
    this.BusinessReference = params.BusinessReference;
    this.CustomerId = params.CustomerId ?? null;
    this.CustomerSourceSystem = params.CustomerSourceSystem ?? null;
    this.CustomerExternalReference = params.CustomerExternalReference ?? null;
    this.CustomerCode = params.CustomerCode ?? null;
    this.ShipToReference = params.ShipToReference ?? null;
    this.OwnerId = params.OwnerId;
    this.OwnerCode = params.OwnerCode ?? null;
    this.WarehouseId = params.WarehouseId;
    this.WarehouseCode = params.WarehouseCode ?? null;
    this.Priority = params.Priority ?? null;
    this.CutoffAt = params.CutoffAt ?? null;
    this.DocumentStatus = params.DocumentStatus;
    this.ValidationErrors = params.ValidationErrors ?? [];
    this.CoreFlowInstanceId = params.CoreFlowInstanceId ?? null;
    this.OutboxMessageId = params.OutboxMessageId ?? null;
    this.ImportIdempotencyKey = params.ImportIdempotencyKey;
    this.ImportPayloadFingerprint = params.ImportPayloadFingerprint;
    this.ReasonCode = params.ReasonCode ?? null;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? [];
    this.ActionIdempotency = params.ActionIdempotency ?? {};
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
