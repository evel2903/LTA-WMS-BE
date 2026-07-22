import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  ApplyRolePermissionDiff,
  BuildRolePermissionAuditEntry,
  DiffRolePermissions,
  ResolveCatalogPairs,
} from '@modules/AccessControl/Application/Services/RolePermissionDiff';
import { ROLE_PERMISSION_GRANTS } from '@modules/AccessControl/Application/Services/AccessControlCatalog';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { EffectivePermissionsDto, ResetRolePermissionsDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { NextRoleUpdatedAt } from '@modules/AccessControl/Application/Services/RoleMetadataVersion';

/**
 * POST reset: restores a SYSTEM role's permissions to exactly its default seed grants
 * (Signal 2' exit valve for the PUT add-only guard). Reuses PUT's diff+apply mechanism
 * (contract §4 steps 3+6) but skips the rider (4) and add-only (5) checks -- both exist
 * to protect PUT from accidental damage; neither applies when the target IS the seed
 * (restoring seed-only write-actions back is the point, and stripping non-seed grants
 * down to the seed is add-only's exact opposite). The seed is used AS-IS -- NOT run
 * through Read auto-prerequisite, since it's the ground truth, not user input to
 * complete (a seed grant can legitimately lack its own Read, e.g. QC's
 * Override:OverrideLog -- see story Dev Notes). A system role with zero seed grants
 * defined is NOT an error (Decision #10): `defaultSeedPairs=[]` is a valid target and
 * reset wipes the role's permissions to match -- "empty seed resets to empty" is
 * consistent, not a special case to guard against. Like PUT, the role is re-locked and
 * re-diffed INSIDE the transaction (Review Findings #3). Also bumps `PermissionsVersion`
 * like PUT does (RA-04 review, Decision #1) so a PUT racing against this reset with a
 * now-stale version gets a clean 409 instead of silently re-adding what reset just
 * stripped -- but reset itself does NOT check the caller's version: it is an unconditional
 * restore-to-seed, not a diff against the caller's view, so there is nothing to compare.
 */
export class ResetRolePermissionsUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: ResetRolePermissionsDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<EffectivePermissionsDto> {
    const role = await this.roleRepository.FindById(request.Id);
    if (!role) throw new NotFoundException('Role not found');
    if (!role.IsSystem) {
      throw new BusinessRuleException('Only a system role can be reset to its default seed permissions');
    }

    const defaultSeedPairs = ROLE_PERMISSION_GRANTS.filter((grant) => grant.Role === role.RoleCode).map((grant) => ({
      Action: grant.Action,
      ObjectType: grant.ObjectType,
    }));

    const validatedReason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Role,
    });
    if (validatedReason.EvidenceRequired && !(request.EvidenceRefs && request.EvidenceRefs.length > 0)) {
      throw new BusinessRuleException(`Evidence is required for reason code ${request.ReasonCode}`);
    }

    const resolvedDefault = await ResolveCatalogPairs(defaultSeedPairs, this.permissionRepository);
    const defaultPermissions = resolvedDefault.map((p) => ({ Action: p.Action, ObjectType: p.ObjectType }));

    if (!this.auditedTransaction) {
      const current = await this.rolePermissionRepository.FindByRoleId(role.Id);
      const { Added: added, Removed: removed } = DiffRolePermissions(resolvedDefault, current);
      await ApplyRolePermissionDiff({
        Role: role,
        Added: added,
        Removed: removed,
        ActorUserId: request.ActorUserId,
        RolePermissionRepository: this.rolePermissionRepository,
      });
      return {
        Permissions: defaultPermissions,
        Version: role.PermissionsVersion,
      };
    }

    return this.auditedTransaction.Run(async (manager) => {
      const locked = await this.roleRepository.FindByIdForUpdate(request.Id, manager);
      if (!locked) throw new NotFoundException('Role not found');

      const current = await this.rolePermissionRepository.FindByRoleId(locked.Id, manager);
      const currentPermissions = await this.permissionRepository.FindByIds(current.map((rp) => rp.PermissionId));
      const { Added: added, Removed: removed } = DiffRolePermissions(resolvedDefault, current);
      // No rider / add-only check, no Version check -- see class doc.

      await ApplyRolePermissionDiff({
        Role: locked,
        Added: added,
        Removed: removed,
        ActorUserId: request.ActorUserId,
        RolePermissionRepository: this.rolePermissionRepository,
        Manager: manager,
      });
      locked.PermissionsVersion += 1;
      locked.UpdatedAt = NextRoleUpdatedAt(locked.UpdatedAt);
      await this.roleRepository.Update(locked, manager);

      const entry = BuildRolePermissionAuditEntry({
        Context: context,
        Role: locked,
        Before: currentPermissions,
        After: resolvedDefault,
        ReasonCodeId: validatedReason.ReasonCodeId,
        ReasonNote: request.ReasonNote,
        EvidenceRefs: request.EvidenceRefs,
      });
      const response: EffectivePermissionsDto = {
        Permissions: defaultPermissions,
        Version: locked.PermissionsVersion,
      };
      return { result: response, entry };
    });
  }
}
