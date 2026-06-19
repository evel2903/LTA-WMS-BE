import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface CreateOwnerDto {
  OwnerCode: string;
  OwnerName: string;
  Status: MasterDataStatus;
  BillingPolicy?: Record<string, unknown>;
  VisibilityScope?: Record<string, unknown>;
  SourceSystem?: string;
  ReferenceId?: string;
  ReasonCode?: string | null;
}
