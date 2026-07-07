export interface ChangeInventoryStatusDto {
  SourceBalanceId: string;
  TargetInventoryStatusCode: string;
  Quantity: number;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface MoveInventoryInternalDto {
  SourceBalanceId: string;
  TargetLocationId: string;
  Quantity: number;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface CorrectSerialNumberDto {
  /**
   * Keyed by dimension, not balance, unlike ChangeInventoryStatusDto/MoveInventoryInternalDto —
   * the FE's serial/lot lookup row only carries a DimensionId (InventorySerialLookupItem never
   * exposes the underlying InventoryBalance.Id). Resolved to a balance internally.
   */
  SourceDimensionId: string;
  NewSerialNumber: string;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}
