export class PackageContentEntity {
  public readonly Id: string;
  public PackageId: string;
  public PickTaskId: string;
  public OutboundOrderLineId: string;
  public SourceBalanceId: string;
  public SourceDimensionId: string;
  public SkuId: string;
  public SkuCode: string | null;
  public UomId: string;
  public UomCode: string | null;
  public Quantity: number;
  public InventoryStatusCode: string | null;
  public LotNumber: string | null;
  public SerialNumber: string | null;
  public ExpiryDate: Date | null;
  public readonly CreatedAt: Date;

  constructor(params: {
    Id: string;
    PackageId: string;
    PickTaskId: string;
    OutboundOrderLineId: string;
    SourceBalanceId: string;
    SourceDimensionId: string;
    SkuId: string;
    SkuCode?: string | null;
    UomId: string;
    UomCode?: string | null;
    Quantity: number;
    InventoryStatusCode?: string | null;
    LotNumber?: string | null;
    SerialNumber?: string | null;
    ExpiryDate?: Date | null;
    CreatedAt: Date;
  }) {
    this.Id = params.Id;
    this.PackageId = params.PackageId;
    this.PickTaskId = params.PickTaskId;
    this.OutboundOrderLineId = params.OutboundOrderLineId;
    this.SourceBalanceId = params.SourceBalanceId;
    this.SourceDimensionId = params.SourceDimensionId;
    this.SkuId = params.SkuId;
    this.SkuCode = params.SkuCode ?? null;
    this.UomId = params.UomId;
    this.UomCode = params.UomCode ?? null;
    this.Quantity = params.Quantity;
    this.InventoryStatusCode = params.InventoryStatusCode ?? null;
    this.LotNumber = params.LotNumber ?? null;
    this.SerialNumber = params.SerialNumber ?? null;
    this.ExpiryDate = params.ExpiryDate ?? null;
    this.CreatedAt = params.CreatedAt;
  }
}
