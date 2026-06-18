import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface UpdateItemCoverageDto {
  Id: string;
  SkuId?: string;
  WarehouseId?: string;
  OwnerId?: string | null;
  MinQty?: number | null;
  MaxQty?: number | null;
  StandardQty?: number | null;
  MultipleQty?: number | null;
  LeadTimeDays?: number | null;
  DefaultReceiveWarehouseId?: string | null;
  DefaultShipWarehouseId?: string | null;
  ReorderPolicy?: Record<string, unknown> | null;
  StopReceiving?: boolean;
  StopShipping?: boolean;
  Status?: MasterDataStatus;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}
