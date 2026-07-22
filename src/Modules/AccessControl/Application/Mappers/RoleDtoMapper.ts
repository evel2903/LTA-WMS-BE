import { RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { PermissionDtoMapper } from '@modules/AccessControl/Application/Mappers/PermissionDtoMapper';

export class RoleDtoMapper {
  public static ToDto(entity: RoleEntity, permissions?: PermissionEntity[]): RoleDto {
    return {
      Id: entity.Id,
      RoleCode: entity.RoleCode,
      RoleName: entity.RoleName,
      Description: entity.Description,
      IsSystem: entity.IsSystem,
      Status: entity.Status,
      PermissionsVersion: entity.PermissionsVersion,
      UpdatedAt: entity.UpdatedAt.toISOString(),
      ...(permissions ? { Permissions: permissions.map(PermissionDtoMapper.ToDto) } : {}),
    };
  }
}
