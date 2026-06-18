import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface CreateUomConversionDto {
  SkuId: string;
  FromUomId: string;
  ToUomId: string;
  Factor: number;
  EffectiveFrom: Date;
  EffectiveTo?: Date | null;
  Status: MasterDataStatus;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}
