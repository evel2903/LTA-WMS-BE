import { WarehouseProfileAssignmentDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileAssignmentDto';
import { WarehouseProfileAssignmentEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignmentEntity';

export class WarehouseProfileAssignmentDtoMapper {
  public static ToDto(entity: WarehouseProfileAssignmentEntity): WarehouseProfileAssignmentDto {
    return {
      Id: entity.Id,
      WarehouseProfileId: entity.WarehouseProfileId,
      AssignmentType: entity.AssignmentType,
      WarehouseTypeCode: entity.WarehouseTypeCode,
      WarehouseId: entity.WarehouseId,
      ScopeKey: entity.ScopeKey,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
