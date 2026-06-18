import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';
import { DataOwnershipMode } from '@modules/MasterData/Domain/Enums/DataOwnershipMode';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { OwnershipPolicyImplementationStatus } from '@modules/MasterData/Domain/Enums/OwnershipPolicyImplementationStatus';
import { SourceOfTruthType } from '@modules/MasterData/Domain/Enums/SourceOfTruthType';
import { MasterDataOwnershipPolicyOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/MasterDataOwnershipPolicyOrmEntity';

export class MasterDataOwnershipPolicyOrmMapper {
  public static ToDomain(entity: MasterDataOwnershipPolicyOrmEntity): MasterDataOwnershipPolicyEntity {
    return new MasterDataOwnershipPolicyEntity({
      Id: entity.Id,
      ObjectGroup: entity.ObjectGroup as MasterDataObjectGroup,
      DisplayName: entity.DisplayName,
      SourceOfTruthType: entity.SourceOfTruthType as SourceOfTruthType,
      TypicalSourceSystems: entity.TypicalSourceSystems,
      OwnershipMode: entity.OwnershipMode as DataOwnershipMode,
      DirectEditAllowed: entity.DirectEditAllowed,
      RequiresAudit: entity.RequiresAudit,
      RequiresReason: entity.RequiresReason,
      RequiresSourceSystem: entity.RequiresSourceSystem,
      RequiresReferenceId: entity.RequiresReferenceId,
      ImplementationStatus: entity.ImplementationStatus as OwnershipPolicyImplementationStatus,
      DeferredToStory: entity.DeferredToStory,
      PolicyNotes: entity.PolicyNotes,
      SourceDocRef: entity.SourceDocRef,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }
}
