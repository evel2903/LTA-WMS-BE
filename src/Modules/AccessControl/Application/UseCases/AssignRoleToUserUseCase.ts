import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { AssignRoleDto } from '@modules/AccessControl/Application/DTOs/AssignRoleDto';
import { UserRoleDto } from '@modules/AccessControl/Application/DTOs/UserRoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';

/**
 * Assigns a V0 role to a user (manual grant). Unknown role → NotFound; duplicate
 * grant → Conflict. Enforcement of WHO may call this (PermissionGuard) is C2.
 */
export class AssignRoleToUserUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly userRoleRepository: IUserRoleRepository,
  ) {}

  public async Execute(input: AssignRoleDto): Promise<UserRoleDto> {
    const role = await this.roleRepository.FindByCode(input.RoleCode as RoleCode);
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.userRoleRepository.FindByUserAndRole(input.UserId, role.Id);
    if (existing) throw new ConflictException('User already has this role');

    const created = await this.userRoleRepository.Create(
      new UserRoleEntity({
        Id: randomUUID(),
        UserId: input.UserId,
        RoleId: role.Id,
        Source: UserRoleSource.Manual,
        AssignedAt: new Date(),
        AssignedBy: input.AssignedBy ?? null,
      }),
    );

    return {
      Id: created.Id,
      UserId: created.UserId,
      RoleId: created.RoleId,
      RoleCode: role.RoleCode,
      Source: created.Source,
      AssignedAt: created.AssignedAt.toISOString(),
    };
  }
}
