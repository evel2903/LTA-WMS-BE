export interface InventorySerialLookupDto {
  DimensionId: string;
  SkuId: string;
  SkuCode: string;
  WarehouseId: string;
  WarehouseCode: string;
  LocationId: string;
  LocationCode: string;
  SerialNumber: string | null;
  LotNumber: string | null;
  ExpiryDate: Date | null;
  QtyOnHand: number;
  QtyAvailable: number;
  InventoryStatusCode: string;
}
