import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface SkuBarcodeDto {
  Id: string;
  SkuId: string;
  OwnerId: string | null;
  UomId: string;
  PackCode: string | null;
  BarcodeValue: string;
  BarcodeType: string;
  IsPrimary: boolean;
  Status: MasterDataStatus;
  EffectiveFrom: Date | null;
  EffectiveTo: Date | null;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
