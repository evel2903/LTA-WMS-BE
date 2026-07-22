import {
  BusinessRuleException,
  CatalogVersionUnavailableException,
  ConflictException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { UpdateRoleDto, RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { RoleDtoMapper } from '@modules/AccessControl/Application/Mappers/RoleDtoMapper';
import { NextRoleUpdatedAt } from '@modules/AccessControl/Application/Services/RoleMetadataVersion';
import { IRoleCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IRoleCatalogRepository';

/**
 * PATCH: `role_name`/`description` may change on ANY role (including system roles).
 * `status` may only change on a custom role — a system role's status is immutable
 * (contract §3 AC2). `role_code` is never re-keyable here (not part of the DTO).
 */
export class UpdateRoleUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly auditedTransaction: AuditedTransaction,
    private readonly catalogRepository: IRoleCatalogRepository,
  ) {}

  public async Execute(request: UpdateRoleDto, context: AuditContext = SystemAuditContext): Promise<RoleDto> {
    if (!this.auditedTransaction) {
      throw new BusinessRuleException('Role metadata updates require an audited transaction');
    }
    if (!this.catalogRepository) throw new CatalogVersionUnavailableException();
    const auditedTransaction = this.auditedTransaction;
    const catalogRepository = this.catalogRepository;
    return auditedTransaction.Run(async (manager) => {
      const locked = await this.roleRepository.FindByIdForUpdate(request.Id, manager);
      if (!locked) throw new NotFoundException('Role not found');

      // Status on system roles is invalid whenever supplied, including the same value. This
      // domain validation intentionally wins over stale-token and no-op classification.
      if (request.Status !== undefined && locked.IsSystem) {
        throw new BusinessRuleException('A system role status cannot be changed');
      }

      if (new Date(request.ExpectedUpdatedAt).getTime() !== locked.UpdatedAt.getTime()) {
        throw new ConflictException('Role metadata changed since this page was loaded.', {
          Reason: 'ROLE_METADATA_STALE',
          CurrentUpdatedAt: locked.UpdatedAt.toISOString(),
        });
      }

      const nextRoleName = request.RoleName === undefined ? locked.RoleName : request.RoleName.trim();
      if (nextRoleName.length === 0) {
        throw new BusinessRuleException('RoleName must not be empty');
      }
      const nextDescription =
        request.Description === undefined
          ? locked.Description
          : request.Description === null || request.Description === ''
            ? null
            : request.Description;
      const nextStatus = request.Status ?? locked.Status;
      const changed =
        nextRoleName !== locked.RoleName ||
        (nextDescription ?? '') !== (locked.Description ?? '') ||
        nextStatus !== locked.Status;
      const identityChanged = nextRoleName !== locked.RoleName || nextStatus !== locked.Status;

      if (!changed) {
        return { result: RoleDtoMapper.ToDto(locked), entry: [] };
      }

      const before = RoleDtoMapper.ToDto(locked) as unknown as Record<string, unknown>;
      locked.RoleName = nextRoleName;
      locked.Description = nextDescription;
      locked.Status = nextStatus;
      locked.UpdatedAt = NextRoleUpdatedAt(locked.UpdatedAt);
      locked.UpdatedBy = request.ActorUserId ?? locked.UpdatedBy;

      const updated = await this.roleRepository.Update(locked, manager);
      if (identityChanged) await catalogRepository.Bump(manager);
      const entry = MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Role,
        ObjectId: updated.Id,
        ObjectCode: updated.RoleCode,
        BeforeJson: before,
        AfterJson: RoleDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
      });
      return { result: RoleDtoMapper.ToDto(updated), entry };
    });
  }
}
