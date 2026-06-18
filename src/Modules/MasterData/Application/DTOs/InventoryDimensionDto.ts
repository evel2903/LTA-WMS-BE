export interface InventoryDimensionDto {
  Id: string;
  OwnerId: string;
  SkuId: string;
  WarehouseId: string;
  LocationId: string;
  InventoryStatusId: string;
  DimensionKeyHash: string;
  UomId: string | null;
  LpnCode: string | null;
  LotNumber: string | null;
  ExpiryDate: Date | null;
  SerialNumber: string | null;
  ProductionDate: Date | null;
  CountryOfOrigin: string | null;
  CustomsStatus: string | null;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
