import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';

export class AllocationLineEntity {
  public readonly Id: string;
  public AllocationId: string;
  public OutboundOrderLineId: string;
  public LineNumber: number;
  public SkuId: string;
  public SkuCode: string | null;
  public UomId: string;
  public UomCode: string | null;
  public OrderedQuantity: number;
  public AllocatedQuantity: number;
  public BackorderedQuantity: number;
  public SourceBalanceId: string | null;
  public SourceDimensionId: string | null;
  public SourceLocationId: string | null;
  public InventoryStatusCode: string | null;
  public LotNumber: string | null;
  public SerialNumber: string | null;
  public ExpiryDate: Date | null;
  public Status: AllocationStatus;
  public ShortageReason: string | null;
  public readonly CreatedAt: Date;

  constructor(params: {
    Id: string;
    AllocationId: string;
    OutboundOrderLineId: string;
    LineNumber: number;
    SkuId: string;
    SkuCode?: string | null;
    UomId: string;
    UomCode?: string | null;
    OrderedQuantity: number;
    AllocatedQuantity?: number;
    BackorderedQuantity?: number;
    SourceBalanceId?: string | null;
    SourceDimensionId?: string | null;
    SourceLocationId?: string | null;
    InventoryStatusCode?: string | null;
    LotNumber?: string | null;
    SerialNumber?: string | null;
    ExpiryDate?: Date | null;
    Status: AllocationStatus;
    ShortageReason?: string | null;
    CreatedAt: Date;
  }) {
    this.Id = params.Id;
    this.AllocationId = params.AllocationId;
    this.OutboundOrderLineId = params.OutboundOrderLineId;
    this.LineNumber = params.LineNumber;
    this.SkuId = params.SkuId;
    this.SkuCode = params.SkuCode ?? null;
    this.UomId = params.UomId;
    this.UomCode = params.UomCode ?? null;
    this.OrderedQuantity = params.OrderedQuantity;
    this.AllocatedQuantity = params.AllocatedQuantity ?? 0;
    this.BackorderedQuantity = params.BackorderedQuantity ?? 0;
    this.SourceBalanceId = params.SourceBalanceId ?? null;
    this.SourceDimensionId = params.SourceDimensionId ?? null;
    this.SourceLocationId = params.SourceLocationId ?? null;
    this.InventoryStatusCode = params.InventoryStatusCode ?? null;
    this.LotNumber = params.LotNumber ?? null;
    this.SerialNumber = params.SerialNumber ?? null;
    this.ExpiryDate = params.ExpiryDate ?? null;
    this.Status = params.Status;
    this.ShortageReason = params.ShortageReason ?? null;
    this.CreatedAt = params.CreatedAt;
  }
}
