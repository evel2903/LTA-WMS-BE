import { NotFoundException } from '@common/Exceptions/AppException';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';

export class RemoveRoleFromUserUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly userRoleRepository: IUserRoleRepository,
  ) {}

  public async Execute(input: { UserId: string; RoleCode: string }): Promise<{ Removed: boolean }> {
    const role = await this.roleRepository.FindByCode(input.RoleCode as RoleCode);
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.userRoleRepository.FindByUserAndRole(input.UserId, role.Id);
    if (!existing) throw new NotFoundException('User does not have this role');

    await this.userRoleRepository.Delete(existing.Id);
    return { Removed: true };
  }
}
