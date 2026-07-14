import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AssignRoleDto } from '@modules/AccessControl/Application/DTOs/AssignRoleDto';
import { UserRoleDto } from '@modules/AccessControl/Application/DTOs/UserRoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';

/**
 * Assigns a V0 role to a user (manual grant). Unknown role → NotFound; duplicate
 * grant → Conflict. Enforcement of WHO may call this (PermissionGuard) is C2.
 */
export class AssignRoleToUserUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. This is AUDIT-ONLY (no ownership policy / reason code).
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(input: AssignRoleDto, context: AuditContext = SystemAuditContext): Promise<UserRoleDto> {
    const role = await this.roleRepository.FindByCode(input.RoleCode);
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.userRoleRepository.FindByUserAndRole(input.UserId, role.Id);
    if (existing) throw new ConflictException('User already has this role');

    const userRole = new UserRoleEntity({
      Id: randomUUID(),
      UserId: input.UserId,
      RoleId: role.Id,
      Source: UserRoleSource.Manual,
      AssignedAt: new Date(),
      AssignedBy: input.AssignedBy ?? null,
    });

    const toDto = (created: UserRoleEntity): UserRoleDto => ({
      Id: created.Id,
      UserId: created.UserId,
      RoleId: created.RoleId,
      RoleCode: role.RoleCode,
      Source: created.Source,
      AssignedAt: created.AssignedAt.toISOString(),
    });

    const buildEntry = (created: UserRoleEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.UserAssignment,
        ObjectId: created.Id,
        ObjectCode: role.RoleCode,
        AfterJson: toDto(created) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.userRoleRepository.Create(userRole);
      return toDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.userRoleRepository.Create(userRole, manager);
      return { result: toDto(created), entry: buildEntry(created) };
    });
  }
}
