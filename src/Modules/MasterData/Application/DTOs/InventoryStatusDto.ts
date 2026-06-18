import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface InventoryStatusDto {
  Id: string;
  StatusCode: string;
  DisplayName: string;
  StageGroup: string;
  AllowsAllocation: boolean;
  AllowsPick: boolean;
  IsTerminal: boolean;
  IsMilestone: boolean;
  SortOrder: number;
  Status: MasterDataStatus;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
