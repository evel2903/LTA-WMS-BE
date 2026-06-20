import { NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';

export class RemoveRoleFromUserUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. This is AUDIT-ONLY (no ownership policy / reason code).
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    input: { UserId: string; RoleCode: string },
    context: AuditContext = SystemAuditContext,
  ): Promise<{ Removed: boolean }> {
    const role = await this.roleRepository.FindByCode(input.RoleCode as RoleCode);
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.userRoleRepository.FindByUserAndRole(input.UserId, role.Id);
    if (!existing) throw new NotFoundException('User does not have this role');

    const before = this.ToJson(existing);
    const buildEntry = () =>
      MergeAuditContext(context, {
        Action: ActionCode.DeleteCancel,
        ObjectType: ObjectType.UserAssignment,
        ObjectId: existing.Id,
        ObjectCode: role.RoleCode,
        BeforeJson: before,
      });

    if (!this.auditedTransaction) {
      await this.userRoleRepository.Delete(existing.Id);
      return { Removed: true };
    }
    return this.auditedTransaction.Run(async (manager) => {
      await this.userRoleRepository.Delete(existing.Id, manager);
      return { result: { Removed: true }, entry: buildEntry() };
    });
  }

  private ToJson(userRole: UserRoleEntity): Record<string, unknown> {
    return {
      Id: userRole.Id,
      UserId: userRole.UserId,
      RoleId: userRole.RoleId,
      Source: userRole.Source,
      AssignedAt: userRole.AssignedAt.toISOString(),
      AssignedBy: userRole.AssignedBy,
    };
  }
}
