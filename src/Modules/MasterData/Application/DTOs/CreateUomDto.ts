import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface CreateUomDto {
  UomCode: string;
  UomName: string;
  UomType?: string;
  DecimalPrecision?: number;
  Status: MasterDataStatus;
  SourceSystem?: string;
  ReferenceId?: string;
  ReasonCode?: string | null;
}
