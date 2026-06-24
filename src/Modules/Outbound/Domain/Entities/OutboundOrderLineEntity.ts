export class OutboundOrderLineEntity {
  public readonly Id: string;
  public OutboundOrderId: string;
  public LineNumber: number;
  public SkuId: string;
  public SkuCode: string | null;
  public UomId: string;
  public UomCode: string | null;
  public OrderedQuantity: number;
  public ExternalLineReference: string | null;
  public ValidationErrors: string[];
  public readonly CreatedAt: Date;

  constructor(params: {
    Id: string;
    OutboundOrderId: string;
    LineNumber: number;
    SkuId: string;
    SkuCode?: string | null;
    UomId: string;
    UomCode?: string | null;
    OrderedQuantity: number;
    ExternalLineReference?: string | null;
    ValidationErrors?: string[];
    CreatedAt: Date;
  }) {
    this.Id = params.Id;
    this.OutboundOrderId = params.OutboundOrderId;
    this.LineNumber = params.LineNumber;
    this.SkuId = params.SkuId;
    this.SkuCode = params.SkuCode ?? null;
    this.UomId = params.UomId;
    this.UomCode = params.UomCode ?? null;
    this.OrderedQuantity = params.OrderedQuantity;
    this.ExternalLineReference = params.ExternalLineReference ?? null;
    this.ValidationErrors = params.ValidationErrors ?? [];
    this.CreatedAt = params.CreatedAt;
  }
}
