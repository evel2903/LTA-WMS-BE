export class InventoryDimensionEntity {
  public readonly Id: string;
  public OwnerId: string;
  public SkuId: string;
  public WarehouseId: string;
  public LocationId: string;
  public InventoryStatusId: string;
  public DimensionKeyHash: string;
  public UomId: string | null;
  public LpnCode: string | null;
  public LotNumber: string | null;
  public ExpiryDate: Date | null;
  public SerialNumber: string | null;
  public ProductionDate: Date | null;
  public CountryOfOrigin: string | null;
  public CustomsStatus: string | null;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    OwnerId: string;
    SkuId: string;
    WarehouseId: string;
    LocationId: string;
    InventoryStatusId: string;
    DimensionKeyHash: string;
    UomId?: string | null;
    LpnCode?: string | null;
    LotNumber?: string | null;
    ExpiryDate?: Date | null;
    SerialNumber?: string | null;
    ProductionDate?: Date | null;
    CountryOfOrigin?: string | null;
    CustomsStatus?: string | null;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.OwnerId = params.OwnerId;
    this.SkuId = params.SkuId;
    this.WarehouseId = params.WarehouseId;
    this.LocationId = params.LocationId;
    this.InventoryStatusId = params.InventoryStatusId;
    this.DimensionKeyHash = params.DimensionKeyHash;
    this.UomId = params.UomId ?? null;
    this.LpnCode = params.LpnCode ?? null;
    this.LotNumber = params.LotNumber ?? null;
    this.ExpiryDate = params.ExpiryDate ?? null;
    this.SerialNumber = params.SerialNumber ?? null;
    this.ProductionDate = params.ProductionDate ?? null;
    this.CountryOfOrigin = params.CountryOfOrigin ?? null;
    this.CustomsStatus = params.CustomsStatus ?? null;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
