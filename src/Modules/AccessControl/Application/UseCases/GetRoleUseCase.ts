import { NotFoundException } from '@common/Exceptions/AppException';
import { RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { RoleDtoMapper } from '@modules/AccessControl/Application/Mappers/RoleDtoMapper';
import { CanonicalizeRoleCode } from '@modules/AccessControl/Application/Utils/CanonicalizeRoleCode';

export class GetRoleUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  public async Execute(roleCode: string): Promise<RoleDto> {
    const role = await this.roleRepository.FindByCode(CanonicalizeRoleCode(roleCode));
    if (!role) throw new NotFoundException('Role not found');

    const rolePermissions = await this.rolePermissionRepository.FindByRoleId(role.Id);
    const permissions = await this.permissionRepository.FindByIds(rolePermissions.map((rp) => rp.PermissionId));
    return RoleDtoMapper.ToDto(role, permissions);
  }
}
