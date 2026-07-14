import { randomUUID } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateRoleDto, RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { RoleDtoMapper } from '@modules/AccessControl/Application/Mappers/RoleDtoMapper';

const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;

/**
 * Creates a custom (non-system) role, always Active. `role_code` is normalized
 * uppercase before the format check (contract §3) so callers may submit lower/mixed case.
 */
export class CreateRoleUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it.
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateRoleDto, context: AuditContext = SystemAuditContext): Promise<RoleDto> {
    const roleCode = request.RoleCode.trim().toUpperCase();
    if (!ROLE_CODE_PATTERN.test(roleCode)) {
      throw new BusinessRuleException('RoleCode must match ^[A-Z][A-Z0-9_]{1,49}$');
    }

    const now = new Date();
    const role = new RoleEntity({
      Id: randomUUID(),
      RoleCode: roleCode,
      RoleName: request.RoleName,
      Description: request.Description ?? null,
      IsSystem: false,
      Status: RoleStatus.Active,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: request.ActorUserId ?? null,
      UpdatedBy: null,
    });

    const buildEntry = (created: RoleEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Role,
        ObjectId: created.Id,
        ObjectCode: created.RoleCode,
        AfterJson: RoleDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.roleRepository.Create(role);
      return RoleDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.roleRepository.Create(role, manager);
      return { result: RoleDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
