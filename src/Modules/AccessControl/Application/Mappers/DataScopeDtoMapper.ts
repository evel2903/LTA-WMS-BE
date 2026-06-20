import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { DataScopeDto } from '@modules/AccessControl/Application/DTOs/DataScopeDto';

export class DataScopeDtoMapper {
  public static ToDto(entity: DataScopeEntity): DataScopeDto {
    return {
      Id: entity.Id,
      ScopeType: entity.ScopeType,
      ScopeValueId: entity.ScopeValueId,
      ScopeValueCode: entity.ScopeValueCode,
      IncludeAll: entity.IncludeAll,
    };
  }
}
