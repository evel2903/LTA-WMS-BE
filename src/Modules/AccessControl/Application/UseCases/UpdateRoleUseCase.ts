import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { UpdateRoleDto, RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { RoleDtoMapper } from '@modules/AccessControl/Application/Mappers/RoleDtoMapper';

/**
 * PATCH: `role_name`/`description` may change on ANY role (including system roles).
 * `status` may only change on a custom role — a system role's status is immutable
 * (contract §3 AC2). `role_code` is never re-keyable here (not part of the DTO).
 */
export class UpdateRoleUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it.
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: UpdateRoleDto, context: AuditContext = SystemAuditContext): Promise<RoleDto> {
    const role = await this.roleRepository.FindById(request.Id);
    if (!role) throw new NotFoundException('Role not found');
    const before = RoleDtoMapper.ToDto(role) as unknown as Record<string, unknown>;

    if (request.Status !== undefined && role.IsSystem) {
      throw new BusinessRuleException('A system role status cannot be changed');
    }

    if (request.RoleName !== undefined) role.RoleName = request.RoleName;
    if (request.Description !== undefined) role.Description = request.Description;
    if (request.Status !== undefined) role.Status = request.Status;
    role.UpdatedAt = new Date();
    role.UpdatedBy = request.ActorUserId ?? role.UpdatedBy;

    const buildEntry = (updated: RoleEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Role,
        ObjectId: updated.Id,
        ObjectCode: updated.RoleCode,
        BeforeJson: before,
        AfterJson: RoleDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const updated = await this.roleRepository.Update(role);
      return RoleDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.roleRepository.Update(role, manager);
      return { result: RoleDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
