export class InboundPlanLineEntity {
  public readonly Id: string;
  public InboundPlanId: string;
  public LineNumber: number;
  public SkuId: string;
  public SkuCode: string | null;
  public UomId: string;
  public UomCode: string | null;
  public ExpectedQuantity: number;
  public ExternalLineReference: string | null;
  public readonly CreatedAt: Date;

  constructor(params: {
    Id: string;
    InboundPlanId: string;
    LineNumber: number;
    SkuId: string;
    SkuCode?: string | null;
    UomId: string;
    UomCode?: string | null;
    ExpectedQuantity: number;
    ExternalLineReference?: string | null;
    CreatedAt: Date;
  }) {
    this.Id = params.Id;
    this.InboundPlanId = params.InboundPlanId;
    this.LineNumber = params.LineNumber;
    this.SkuId = params.SkuId;
    this.SkuCode = params.SkuCode ?? null;
    this.UomId = params.UomId;
    this.UomCode = params.UomCode ?? null;
    this.ExpectedQuantity = params.ExpectedQuantity;
    this.ExternalLineReference = params.ExternalLineReference ?? null;
    this.CreatedAt = params.CreatedAt;
  }
}
