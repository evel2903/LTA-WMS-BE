import { MasterDataOwnershipPolicyDto } from '@modules/MasterData/Application/DTOs/MasterDataOwnershipPolicyDto';
import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';

export class MasterDataOwnershipPolicyMapper {
  public static ToDto(entity: MasterDataOwnershipPolicyEntity): MasterDataOwnershipPolicyDto {
    return {
      Id: entity.Id,
      ObjectGroup: entity.ObjectGroup,
      DisplayName: entity.DisplayName,
      SourceOfTruthType: entity.SourceOfTruthType,
      TypicalSourceSystems: entity.TypicalSourceSystems,
      OwnershipMode: entity.OwnershipMode,
      DirectEditAllowed: entity.DirectEditAllowed,
      RequiresAudit: entity.RequiresAudit,
      RequiresReason: entity.RequiresReason,
      RequiresSourceSystem: entity.RequiresSourceSystem,
      RequiresReferenceId: entity.RequiresReferenceId,
      ImplementationStatus: entity.ImplementationStatus,
      DeferredToStory: entity.DeferredToStory,
      PolicyNotes: entity.PolicyNotes,
      SourceDocRef: entity.SourceDocRef,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
