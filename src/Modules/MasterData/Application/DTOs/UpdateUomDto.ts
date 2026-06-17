import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface UpdateUomDto {
  Id: string;
  UomCode?: string;
  UomName?: string;
  UomType?: string;
  DecimalPrecision?: number;
  Status?: MasterDataStatus;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}
