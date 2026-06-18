import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface CreateSkuBarcodeDto {
  SkuId: string;
  OwnerId?: string | null;
  UomId: string;
  PackCode?: string | null;
  BarcodeValue: string;
  BarcodeType: string;
  IsPrimary?: boolean;
  Status: MasterDataStatus;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}
