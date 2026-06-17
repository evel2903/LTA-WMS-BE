import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export interface OwnerDto {
  Id: string;
  OwnerCode: string;
  OwnerName: string;
  Status: MasterDataStatus;
  BillingPolicy: Record<string, unknown>;
  VisibilityScope: Record<string, unknown>;
  SourceSystem: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
