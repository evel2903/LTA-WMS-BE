import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  ApplyReadPrerequisite,
  ApplyRolePermissionDiff,
  AssertNoRiderViolation,
  AssertSystemRoleAddOnly,
  BuildRolePermissionAuditEntry,
  DiffRolePermissions,
  ResolveCatalogPairs,
} from '@modules/AccessControl/Application/Services/RolePermissionDiff';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { EffectivePermissionsDto, SetRolePermissionsDto } from '@modules/AccessControl/Application/DTOs/RoleDto';

/**
 * PUT: sets a role's permissions as a declarative full-set diff (contract §4). Order is
 * fixed: dedupe + Read auto-prerequisite -> resolve/validate against the 276-permission
 * catalog -> diff vs current -> Signal 4 rider (added) -> Signal 2' add-only (removed,
 * system role only) -> apply + audit. Reason is mandatory and validated before the
 * transaction opens (fail-fast -- a bad reason never touches the DB). The role is
 * re-fetched under a pessimistic write lock INSIDE the transaction and current/diff/guards
 * /apply/audit all run against that one locked snapshot, closing the concurrent-PUT race
 * (Review Findings #3): two overlapping requests can no longer compute added/removed from
 * the same stale `current` and silently clobber each other's grants.
 */
export class SetRolePermissionsUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it.
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: SetRolePermissionsDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<EffectivePermissionsDto> {
    const role = await this.roleRepository.FindById(request.Id);
    if (!role) throw new NotFoundException('Role not found');

    const validatedReason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Role,
    });
    if (validatedReason.EvidenceRequired && !(request.EvidenceRefs && request.EvidenceRefs.length > 0)) {
      throw new BusinessRuleException(`Evidence is required for reason code ${request.ReasonCode}`);
    }

    const desiredPrime = ApplyReadPrerequisite(request.Permissions);
    const resolvedDesired = await ResolveCatalogPairs(desiredPrime, this.permissionRepository);
    const response: EffectivePermissionsDto = {
      Permissions: resolvedDesired.map((p) => ({ Action: p.Action, ObjectType: p.ObjectType })),
    };

    if (!this.auditedTransaction) {
      const current = await this.rolePermissionRepository.FindByRoleId(role.Id);
      const { Added: added, Removed: removed } = DiffRolePermissions(resolvedDesired, current);
      AssertNoRiderViolation(added);
      AssertSystemRoleAddOnly(role.IsSystem, removed);
      await ApplyRolePermissionDiff({
        Role: role,
        Added: added,
        Removed: removed,
        ActorUserId: request.ActorUserId,
        RolePermissionRepository: this.rolePermissionRepository,
      });
      return response;
    }

    return this.auditedTransaction.Run(async (manager) => {
      const locked = await this.roleRepository.FindByIdForUpdate(request.Id, manager);
      if (!locked) throw new NotFoundException('Role not found');

      const current = await this.rolePermissionRepository.FindByRoleId(locked.Id, manager);
      const currentPermissions = await this.permissionRepository.FindByIds(current.map((rp) => rp.PermissionId));
      const { Added: added, Removed: removed } = DiffRolePermissions(resolvedDesired, current);
      AssertNoRiderViolation(added);
      AssertSystemRoleAddOnly(locked.IsSystem, removed);

      await ApplyRolePermissionDiff({
        Role: locked,
        Added: added,
        Removed: removed,
        ActorUserId: request.ActorUserId,
        RolePermissionRepository: this.rolePermissionRepository,
        Manager: manager,
      });
      const entry = BuildRolePermissionAuditEntry({
        Context: context,
        Role: locked,
        Before: currentPermissions,
        After: resolvedDesired,
        ReasonCodeId: validatedReason.ReasonCodeId,
        ReasonNote: request.ReasonNote,
        EvidenceRefs: request.EvidenceRefs,
      });
      return { result: response, entry };
    });
  }
}
