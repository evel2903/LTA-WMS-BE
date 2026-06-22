import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';

export interface MobileScanEventDto {
  Id: string;
  TaskId: string;
  TaskCode: string;
  WarehouseId: string;
  OwnerId: string | null;
  ScanType: MobileScanType;
  RawValue: string;
  NormalizedValue: string | null;
  Result: MobileScanResult;
  ResolvedObjectType: string | null;
  ResolvedObjectId: string | null;
  ParsedValueJson: Record<string, unknown>;
  RejectionCode: string | null;
  RejectionMessage: string | null;
  ReasonCode: string | null;
  DeviceCode: string | null;
  SessionId: string | null;
  ActorUserId: string | null;
  CreatedAt: string;
}
