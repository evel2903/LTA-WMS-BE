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
