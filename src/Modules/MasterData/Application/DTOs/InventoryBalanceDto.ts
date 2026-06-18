export interface InventoryBalanceDto {
  Id: string;
  DimensionId: string;
  QtyOnHand: number;
  QtyReserved: number;
  QtyAvailable: number;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
