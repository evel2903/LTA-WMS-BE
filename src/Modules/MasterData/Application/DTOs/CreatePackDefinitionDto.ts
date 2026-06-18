import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface CreatePackDefinitionDto {
  SkuId: string;
  PackCode: string;
  PackName: string;
  UomId: string;
  QuantityPerPack: number;
  IsDefault?: boolean;
  Status: MasterDataStatus;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}
