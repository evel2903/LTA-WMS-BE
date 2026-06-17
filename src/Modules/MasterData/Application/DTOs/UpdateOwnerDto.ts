import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface UpdateOwnerDto {
  Id: string;
  OwnerCode?: string;
  OwnerName?: string;
  Status?: MasterDataStatus;
  BillingPolicy?: Record<string, unknown>;
  VisibilityScope?: Record<string, unknown>;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}
