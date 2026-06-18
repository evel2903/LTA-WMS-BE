export class InventoryBalanceEntity {
  public readonly Id: string;
  public DimensionId: string;
  public QtyOnHand: number;
  public QtyReserved: number;
  public QtyAvailable: number;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    DimensionId: string;
    QtyOnHand?: number;
    QtyReserved?: number;
    QtyAvailable?: number;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.DimensionId = params.DimensionId;
    this.QtyOnHand = params.QtyOnHand ?? 0;
    this.QtyReserved = params.QtyReserved ?? 0;
    this.QtyAvailable = this.QtyOnHand - this.QtyReserved;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
