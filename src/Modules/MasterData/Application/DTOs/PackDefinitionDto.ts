import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface PackDefinitionDto {
  Id: string;
  SkuId: string;
  PackCode: string;
  PackName: string;
  UomId: string;
  QuantityPerPack: number;
  IsDefault: boolean;
  Status: MasterDataStatus;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
