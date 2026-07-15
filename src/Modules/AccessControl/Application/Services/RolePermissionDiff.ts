import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';

export interface PermissionPair {
  Action: ActionCode;
  ObjectType: ObjectType;
}

function PairKey(pair: PermissionPair): string {
  return PermissionEntity.BuildCode(pair.Action, pair.ObjectType);
}

/**
 * Contract §4 step 0-1: dedupe the client's requested set, then add `Read:objectType`
 * for every objectType that has >=1 action requested (server-side, even if the client
 * didn't send it). Pure function -- no repository access.
 */
export function ApplyReadPrerequisite(desired: PermissionPair[]): PermissionPair[] {
  const result = new Map<string, PermissionPair>();
  for (const pair of desired) result.set(PairKey(pair), pair);
  const objectTypes = new Set(desired.map((pair) => pair.ObjectType));
  for (const objectType of objectTypes) {
    const readPair: PermissionPair = { Action: ActionCode.Read, ObjectType: objectType };
    result.set(PairKey(readPair), readPair);
  }
  return [...result.values()];
}

/**
 * Contract §4 step 2: resolve each pair against the real permission catalog
 * (IPermissionRepository), rejecting any pair that isn't seeded (N/A cell). Also
 * dedupes by resolved PermissionEntity.Id, so a caller doesn't need to pre-dedupe.
 */
export async function ResolveCatalogPairs(
  pairs: PermissionPair[],
  permissionRepository: IPermissionRepository,
): Promise<PermissionEntity[]> {
  const resolved = new Map<string, PermissionEntity>();
  for (const pair of pairs) {
    const code = PermissionEntity.BuildCode(pair.Action, pair.ObjectType);
    const permission = await permissionRepository.FindByCode(code);
    if (!permission) {
      throw new BusinessRuleException(`Unknown permission: ${code}`);
    }
    resolved.set(permission.Id, permission);
  }
  return [...resolved.values()];
}

export interface RolePermissionDiff {
  Added: PermissionEntity[];
  Removed: RolePermissionEntity[];
}

/** Contract §4 step 3: added = desired' - current; removed = current - desired' (by PermissionId). */
export function DiffRolePermissions(
  resolvedDesired: PermissionEntity[],
  current: RolePermissionEntity[],
): RolePermissionDiff {
  const desiredIds = new Set(resolvedDesired.map((permission) => permission.Id));
  const currentIds = new Set(current.map((rolePermission) => rolePermission.PermissionId));
  return {
    Added: resolvedDesired.filter((permission) => !currentIds.has(permission.Id)),
    Removed: current.filter((rolePermission) => !desiredIds.has(rolePermission.PermissionId)),
  };
}

/**
 * Contract §4 step 4 (Signal 4 rider): a write-action on Role/Permission can never be
 * newly granted through this endpoint -- only the boot-time seed may hold it. Only
 * `added` is checked; an existing seed-grant already in `current` never appears in
 * `added`, so WMS_ADMIN's own seed-grant is unaffected.
 */
export function AssertNoRiderViolation(added: PermissionEntity[]): void {
  const violation = added.find(
    (permission) =>
      (permission.ObjectType === ObjectType.Role || permission.ObjectType === ObjectType.Permission) &&
      (permission.Action === ActionCode.Create ||
        permission.Action === ActionCode.Update ||
        permission.Action === ActionCode.DeleteCancel),
  );
  if (violation) {
    throw new BusinessRuleException(
      `Cannot grant ${violation.PermissionCode} through the permission editor -- write access on Role/Permission is seed-only`,
    );
  }
}

/**
 * Contract §4 step 5 (Signal 2' add-only): a system role may only gain permissions
 * through this endpoint, never lose them (prevents accidental self-lockout and silent
 * seed-resurrection drift). Use `ResetRolePermissionsUseCase` to restore seed defaults.
 */
export function AssertSystemRoleAddOnly(isSystem: boolean, removed: RolePermissionEntity[]): void {
  if (isSystem && removed.length > 0) {
    throw new BusinessRuleException(
      'A system role can only gain permissions through this endpoint (add-only) -- use reset to restore defaults',
    );
  }
}

/** Contract §4 step 6 (apply): insert every `added` pair, delete every `removed` row. */
export async function ApplyRolePermissionDiff(params: {
  Role: RoleEntity;
  Added: PermissionEntity[];
  Removed: RolePermissionEntity[];
  ActorUserId?: string | null;
  RolePermissionRepository: IRolePermissionRepository;
  Manager?: EntityManager;
}): Promise<void> {
  const {
    Role: role,
    Added: added,
    Removed: removed,
    ActorUserId: actorUserId,
    RolePermissionRepository: repo,
    Manager: manager,
  } = params;
  for (const permission of added) {
    await repo.Create(
      new RolePermissionEntity({
        Id: randomUUID(),
        RoleId: role.Id,
        PermissionId: permission.Id,
        CreatedAt: new Date(),
        CreatedBy: actorUserId ?? null,
      }),
      manager,
    );
  }
  for (const rolePermission of removed) {
    await repo.Delete(rolePermission.Id, manager);
  }
}

/** Shared audit-entry shape for PUT and reset: before/after are sorted permission_code snapshots. */
export function BuildRolePermissionAuditEntry(params: {
  Context: AuditContext;
  Role: RoleEntity;
  Before: PermissionEntity[];
  After: PermissionEntity[];
  ReasonCodeId: string;
  ReasonNote?: string | null;
  EvidenceRefs?: unknown[] | null;
}): AuditEntry {
  return MergeAuditContext(params.Context, {
    Action: ActionCode.Update,
    ObjectType: ObjectType.Role,
    ObjectId: params.Role.Id,
    ObjectCode: params.Role.RoleCode,
    BeforeJson: { Permissions: params.Before.map((permission) => permission.PermissionCode).sort() },
    AfterJson: { Permissions: params.After.map((permission) => permission.PermissionCode).sort() },
    ReasonCodeId: params.ReasonCodeId,
    ReasonNote: params.ReasonNote ?? null,
    EvidenceRefs: params.EvidenceRefs ?? null,
  });
}
