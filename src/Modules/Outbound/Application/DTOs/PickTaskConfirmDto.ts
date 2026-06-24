import { InventoryControlResultDto } from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';
import { PickTaskDto } from '@modules/Outbound/Application/DTOs/PickReleaseDto';
import { MobileTaskDto } from '@modules/TaskExecution/Application/DTOs/MobileTaskDto';

export interface ConfirmPickTaskDto {
  MobileTaskId?: string | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  DeviceCode?: string | null;
  SessionId?: string | null;
  IdempotencyKey: string;
}

export interface PickTaskScanEvidenceDto {
  ScanType: 'Location' | 'Item' | 'Quantity' | 'Lot' | 'Serial' | 'ExpiryDate';
  ScanEventId: string | null;
  RawValue: string | null;
  ExpectedValue: string | number | null;
  ActualValue: string | number | null;
  Result: 'Accepted' | 'Rejected' | 'Missing';
  RejectionCode?: string | null;
}

export interface ConfirmPickTaskResultDto {
  PickTask: PickTaskDto;
  MobileTask: MobileTaskDto | null;
  InventoryControl: InventoryControlResultDto | null;
  ScanEvidence: PickTaskScanEvidenceDto[];
  OutboxMessageId: string | null;
  IsDuplicate: boolean;
}
