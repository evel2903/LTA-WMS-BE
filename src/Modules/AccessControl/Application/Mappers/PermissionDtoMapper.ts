import { PermissionDto } from '@modules/AccessControl/Application/DTOs/PermissionDto';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';

export class PermissionDtoMapper {
  public static ToDto(entity: PermissionEntity): PermissionDto {
    return {
      Id: entity.Id,
      PermissionCode: entity.PermissionCode,
      Action: entity.Action,
      ObjectType: entity.ObjectType,
      Description: entity.Description,
    };
  }
}
