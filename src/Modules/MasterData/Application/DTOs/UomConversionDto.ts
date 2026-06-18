import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface UomConversionDto {
  Id: string;
  SkuId: string;
  FromUomId: string;
  ToUomId: string;
  Factor: number;
  EffectiveFrom: Date;
  EffectiveTo: Date | null;
  Status: MasterDataStatus;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
