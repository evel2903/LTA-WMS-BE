import { OwnerDto } from '@modules/MasterData/Application/DTOs/OwnerDto';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';

export class OwnerDtoMapper {
  public static ToDto(owner: OwnerEntity): OwnerDto {
    return {
      Id: owner.Id,
      OwnerCode: owner.OwnerCode,
      OwnerName: owner.OwnerName,
      Status: owner.Status,
      BillingPolicy: owner.BillingPolicy,
      VisibilityScope: owner.VisibilityScope,
      SourceSystem: owner.SourceSystem,
      ReferenceId: owner.ReferenceId,
      CreatedAt: owner.CreatedAt,
      UpdatedAt: owner.UpdatedAt,
      CreatedBy: owner.CreatedBy,
      UpdatedBy: owner.UpdatedBy,
    };
  }
}
