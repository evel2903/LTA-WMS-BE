import { ReceiptDto, ReceivingSessionDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';

export interface CreateManualReceiptDto {
  OwnerId: string;
  WarehouseId: string;
  WarehouseProfileId?: string | null;
  SupplierId: string;
  ReceiptNumber: string;
  BusinessReference: string;
  SessionKey: string;
  DeviceCode?: string | null;
  IdempotencyKey: string;
}

export interface CreateManualReceiptResultDto {
  Receipt: ReceiptDto;
  Session: ReceivingSessionDto;
  IsDuplicate: boolean;
}

export interface ListReceiptsDto {
  Page?: number;
  PageSize?: number;
  WarehouseId?: string;
  OwnerId?: string;
  Search?: string;
  SortBy?: 'CreatedAt' | 'ReceiptNumber';
  SortDirection?: 'ASC' | 'DESC';
  ActorUserId?: string | null;
}
