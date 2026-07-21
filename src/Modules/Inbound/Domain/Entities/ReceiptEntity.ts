import { ReceiptDocumentStatus } from '@modules/Inbound/Domain/Enums/ReceiptDocumentStatus';

export class ReceiptEntity {
  public readonly Id: string;
  public InboundPlanId: string | null;
  public ReceiptNumber: string;
  public BusinessReference: string;
  public OwnerId: string;
  public OwnerCode: string | null;
  public WarehouseId: string;
  public WarehouseCode: string | null;
  public WarehouseProfileId: string | null;
  public SupplierId: string;
  public IdempotencyKey: string | null;
  public Status: ReceiptDocumentStatus;
  public CoreFlowInstanceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    InboundPlanId: string | null;
    ReceiptNumber: string;
    BusinessReference: string;
    OwnerId: string;
    OwnerCode?: string | null;
    WarehouseId: string;
    WarehouseCode?: string | null;
    WarehouseProfileId?: string | null;
    SupplierId: string;
    IdempotencyKey?: string | null;
    Status?: ReceiptDocumentStatus;
    CoreFlowInstanceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.InboundPlanId = params.InboundPlanId;
    this.ReceiptNumber = params.ReceiptNumber;
    this.BusinessReference = params.BusinessReference;
    this.OwnerId = params.OwnerId;
    this.OwnerCode = params.OwnerCode ?? null;
    this.WarehouseId = params.WarehouseId;
    this.WarehouseCode = params.WarehouseCode ?? null;
    this.WarehouseProfileId = params.WarehouseProfileId ?? null;
    this.SupplierId = params.SupplierId;
    this.IdempotencyKey = params.IdempotencyKey ?? null;
    this.Status = params.Status ?? ReceiptDocumentStatus.Open;
    this.CoreFlowInstanceId = params.CoreFlowInstanceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public MarkLineReceived(updatedBy?: string | null): void {
    if (this.Status === ReceiptDocumentStatus.Open) this.Status = ReceiptDocumentStatus.PartiallyReceived;
    this.UpdatedAt = new Date();
    this.UpdatedBy = updatedBy ?? null;
  }
}
