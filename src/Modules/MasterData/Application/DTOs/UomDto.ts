import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface UomDto {
  Id: string;
  UomCode: string;
  UomName: string;
  UomType: string;
  DecimalPrecision: number;
  Status: MasterDataStatus;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
