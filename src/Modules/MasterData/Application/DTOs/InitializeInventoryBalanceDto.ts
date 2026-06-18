export interface InitializeInventoryBalanceDto {
  DimensionId: string;
  QtyOnHand?: number;
  QtyReserved?: number;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}
