import { DataOwnershipMode } from '@modules/MasterData/Domain/Enums/DataOwnershipMode';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { OwnershipPolicyImplementationStatus } from '@modules/MasterData/Domain/Enums/OwnershipPolicyImplementationStatus';
import { SourceOfTruthType } from '@modules/MasterData/Domain/Enums/SourceOfTruthType';

export interface MasterDataOwnershipPolicyDto {
  Id: string;
  ObjectGroup: MasterDataObjectGroup;
  DisplayName: string;
  SourceOfTruthType: SourceOfTruthType;
  TypicalSourceSystems: string[];
  OwnershipMode: DataOwnershipMode;
  DirectEditAllowed: boolean;
  RequiresAudit: boolean;
  RequiresReason: boolean;
  RequiresSourceSystem: boolean;
  RequiresReferenceId: boolean;
  ImplementationStatus: OwnershipPolicyImplementationStatus;
  DeferredToStory: string | null;
  PolicyNotes: string;
  SourceDocRef: string;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
