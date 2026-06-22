import { ReceivingSessionStatus } from '@modules/Inbound/Domain/Enums/ReceivingSessionStatus';

export class ReceivingSessionEntity {
  public readonly Id: string;
  public InboundPlanId: string;
  public ReceiptId: string;
  public SessionKey: string;
  public DeviceCode: string | null;
  public OwnerId: string;
  public OwnerCode: string | null;
  public WarehouseId: string;
  public WarehouseCode: string | null;
  public Status: ReceivingSessionStatus;
  public StartedAt: Date;
  public ClosedAt: Date | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public StartedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    InboundPlanId: string;
    ReceiptId: string;
    SessionKey: string;
    DeviceCode?: string | null;
    OwnerId: string;
    OwnerCode?: string | null;
    WarehouseId: string;
    WarehouseCode?: string | null;
    Status?: ReceivingSessionStatus;
    StartedAt: Date;
    ClosedAt?: Date | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    StartedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.InboundPlanId = params.InboundPlanId;
    this.ReceiptId = params.ReceiptId;
    this.SessionKey = params.SessionKey;
    this.DeviceCode = params.DeviceCode ?? null;
    this.OwnerId = params.OwnerId;
    this.OwnerCode = params.OwnerCode ?? null;
    this.WarehouseId = params.WarehouseId;
    this.WarehouseCode = params.WarehouseCode ?? null;
    this.Status = params.Status ?? ReceivingSessionStatus.Open;
    this.StartedAt = params.StartedAt;
    this.ClosedAt = params.ClosedAt ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.StartedBy = params.StartedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
