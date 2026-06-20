import { ConflictException } from '@common/Exceptions/AppException';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import {
  IPermissionRepository,
  PermissionListFilter,
} from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { IDataScopeRepository, PrincipalRef } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import {
  IReasonCodeRepository,
  ReasonCodeListFilter,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';
import {
  AuditLogQueryFilter,
  IAuditLogRepository,
} from '@modules/AccessControl/Application/Interfaces/IAuditLogRepository';
import { IAuditWriter } from '@modules/AccessControl/Application/Interfaces/IAuditWriter';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import {
  ApprovalRequestListFilter,
  IApprovalRequestRepository,
} from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { ControlExceptionCatalogEntity } from '@modules/AccessControl/Domain/Entities/ControlExceptionCatalogEntity';
import { IControlExceptionCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalogRepository';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import {
  ExceptionCaseListFilter,
  IExceptionCaseRepository,
} from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ValidationRuleCatalogEntity } from '@modules/AccessControl/Domain/Entities/ValidationRuleCatalogEntity';
import { IValidationRuleCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IValidationRuleCatalogRepository';

export class InMemoryRoleRepository implements IRoleRepository {
  private readonly roles = new Map<string, RoleEntity>();

  public async FindById(id: string): Promise<RoleEntity | null> {
    return this.roles.get(id) ?? null;
  }

  public async FindByCode(roleCode: RoleCode): Promise<RoleEntity | null> {
    return [...this.roles.values()].find((role) => role.RoleCode === roleCode) ?? null;
  }

  public async FindByIds(ids: string[]): Promise<RoleEntity[]> {
    const set = new Set(ids);
    return [...this.roles.values()].filter((role) => set.has(role.Id));
  }

  public async Create(role: RoleEntity): Promise<RoleEntity> {
    if ([...this.roles.values()].some((existing) => existing.RoleCode === role.RoleCode)) {
      throw new ConflictException('Role code already exists');
    }
    this.roles.set(role.Id, role);
    return role;
  }

  public async List(skip: number, take: number): Promise<{ Items: RoleEntity[]; TotalItems: number }> {
    const items = [...this.roles.values()];
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class InMemoryPermissionRepository implements IPermissionRepository {
  private readonly permissions = new Map<string, PermissionEntity>();

  public async FindById(id: string): Promise<PermissionEntity | null> {
    return this.permissions.get(id) ?? null;
  }

  public async FindByCode(permissionCode: string): Promise<PermissionEntity | null> {
    return [...this.permissions.values()].find((p) => p.PermissionCode === permissionCode) ?? null;
  }

  public async FindByIds(ids: string[]): Promise<PermissionEntity[]> {
    const set = new Set(ids);
    return [...this.permissions.values()].filter((p) => set.has(p.Id));
  }

  public async Create(permission: PermissionEntity): Promise<PermissionEntity> {
    if ([...this.permissions.values()].some((p) => p.PermissionCode === permission.PermissionCode)) {
      throw new ConflictException('Permission already exists');
    }
    this.permissions.set(permission.Id, permission);
    return permission;
  }

  public async List(
    skip: number,
    take: number,
    filter: PermissionListFilter = {},
  ): Promise<{ Items: PermissionEntity[]; TotalItems: number }> {
    let items = [...this.permissions.values()];
    if (filter.Action) items = items.filter((p) => p.Action === filter.Action);
    if (filter.ObjectType) items = items.filter((p) => p.ObjectType === filter.ObjectType);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class InMemoryRolePermissionRepository implements IRolePermissionRepository {
  private readonly rolePermissions = new Map<string, RolePermissionEntity>();

  public async FindByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermissionEntity | null> {
    return (
      [...this.rolePermissions.values()].find((rp) => rp.RoleId === roleId && rp.PermissionId === permissionId) ?? null
    );
  }

  public async FindByRoleId(roleId: string): Promise<RolePermissionEntity[]> {
    return [...this.rolePermissions.values()].filter((rp) => rp.RoleId === roleId);
  }

  public async FindByRoleIds(roleIds: string[]): Promise<RolePermissionEntity[]> {
    const set = new Set(roleIds);
    return [...this.rolePermissions.values()].filter((rp) => set.has(rp.RoleId));
  }

  public async FindByPermissionId(permissionId: string): Promise<RolePermissionEntity[]> {
    return [...this.rolePermissions.values()].filter((rp) => rp.PermissionId === permissionId);
  }

  public async Create(rolePermission: RolePermissionEntity): Promise<RolePermissionEntity> {
    if (
      [...this.rolePermissions.values()].some(
        (rp) => rp.RoleId === rolePermission.RoleId && rp.PermissionId === rolePermission.PermissionId,
      )
    ) {
      throw new ConflictException('Permission is already granted to this role');
    }
    this.rolePermissions.set(rolePermission.Id, rolePermission);
    return rolePermission;
  }
}

export class InMemoryUserRoleRepository implements IUserRoleRepository {
  private readonly userRoles = new Map<string, UserRoleEntity>();

  public async FindByUserId(userId: string): Promise<UserRoleEntity[]> {
    return [...this.userRoles.values()].filter((ur) => ur.UserId === userId);
  }

  public async FindByUserAndRole(userId: string, roleId: string): Promise<UserRoleEntity | null> {
    return [...this.userRoles.values()].find((ur) => ur.UserId === userId && ur.RoleId === roleId) ?? null;
  }

  public async Create(userRole: UserRoleEntity): Promise<UserRoleEntity> {
    if ([...this.userRoles.values()].some((ur) => ur.UserId === userRole.UserId && ur.RoleId === userRole.RoleId)) {
      throw new ConflictException('User already has this role');
    }
    this.userRoles.set(userRole.Id, userRole);
    return userRole;
  }

  public async Delete(id: string): Promise<void> {
    this.userRoles.delete(id);
  }
}

export class InMemoryDataScopeRepository implements IDataScopeRepository {
  private readonly scopes = new Map<string, DataScopeEntity>();

  public async FindByPrincipal(principalType: PrincipalType, principalId: string): Promise<DataScopeEntity[]> {
    return [...this.scopes.values()].filter((s) => s.PrincipalType === principalType && s.PrincipalId === principalId);
  }

  public async FindByPrincipals(refs: PrincipalRef[]): Promise<DataScopeEntity[]> {
    if (refs.length === 0) return [];
    return [...this.scopes.values()].filter((s) =>
      refs.some((ref) => ref.Type === s.PrincipalType && ref.Id === s.PrincipalId),
    );
  }

  public async Create(scope: DataScopeEntity): Promise<DataScopeEntity> {
    this.scopes.set(scope.Id, scope);
    return scope;
  }

  public async Delete(id: string): Promise<void> {
    this.scopes.delete(id);
  }
}

export class InMemoryReasonCodeRepository implements IReasonCodeRepository {
  private readonly reasonCodes = new Map<string, ReasonCodeEntity>();

  public async FindById(id: string): Promise<ReasonCodeEntity | null> {
    return this.reasonCodes.get(id) ?? null;
  }

  public async FindByCode(reasonCode: string): Promise<ReasonCodeEntity | null> {
    return [...this.reasonCodes.values()].find((rc) => rc.ReasonCode === reasonCode) ?? null;
  }

  public async Create(reasonCode: ReasonCodeEntity): Promise<ReasonCodeEntity> {
    if ([...this.reasonCodes.values()].some((rc) => rc.ReasonCode === reasonCode.ReasonCode)) {
      throw new ConflictException('Reason code already exists');
    }
    this.reasonCodes.set(reasonCode.Id, reasonCode);
    return reasonCode;
  }

  public async Update(reasonCode: ReasonCodeEntity): Promise<ReasonCodeEntity> {
    this.reasonCodes.set(reasonCode.Id, reasonCode);
    return reasonCode;
  }

  public async List(
    skip: number,
    take: number,
    filter: ReasonCodeListFilter = {},
  ): Promise<{ Items: ReasonCodeEntity[]; TotalItems: number }> {
    let items = [...this.reasonCodes.values()];
    if (filter.ReasonGroup) items = items.filter((rc) => rc.ReasonGroup === filter.ReasonGroup);
    if (filter.Status) items = items.filter((rc) => rc.Status === filter.Status);
    if (filter.Action) items = items.filter((rc) => rc.AppliesToActions.includes(filter.Action!));
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private readonly logs = new Map<string, AuditLogEntity>();

  public async Seed(log: AuditLogEntity): Promise<void> {
    this.logs.set(log.Id, log);
  }

  public async FindById(id: string): Promise<AuditLogEntity | null> {
    return this.logs.get(id) ?? null;
  }

  public async Query(
    skip: number,
    take: number,
    filter: AuditLogQueryFilter = {},
  ): Promise<{ Items: AuditLogEntity[]; TotalItems: number }> {
    let items = [...this.logs.values()];
    if (filter.ActorUserId) items = items.filter((l) => l.ActorUserId === filter.ActorUserId);
    if (filter.Action) items = items.filter((l) => l.Action === filter.Action);
    if (filter.ObjectType) items = items.filter((l) => l.ObjectType === filter.ObjectType);
    if (filter.ObjectId) items = items.filter((l) => l.ObjectId === filter.ObjectId);
    if (filter.ReasonCodeId) items = items.filter((l) => l.ReasonCodeId === filter.ReasonCodeId);
    if (filter.From) items = items.filter((l) => l.OccurredAt.getTime() >= filter.From!.getTime());
    if (filter.To) items = items.filter((l) => l.OccurredAt.getTime() <= filter.To!.getTime());
    items.sort((a, b) => b.OccurredAt.getTime() - a.OccurredAt.getTime());
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class InMemoryApprovalRequestRepository implements IApprovalRequestRepository {
  private readonly requests = new Map<string, ApprovalRequestEntity>();

  public async Seed(request: ApprovalRequestEntity): Promise<void> {
    this.requests.set(request.Id, request);
  }

  public async FindById(id: string): Promise<ApprovalRequestEntity | null> {
    return this.requests.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<ApprovalRequestEntity | null> {
    return this.requests.get(id) ?? null;
  }

  public async Create(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.requests.set(request.Id, request);
    return request;
  }

  public async Update(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    this.requests.set(request.Id, request);
    return request;
  }

  public async List(
    skip: number,
    take: number,
    filter: ApprovalRequestListFilter = {},
  ): Promise<{ Items: ApprovalRequestEntity[]; TotalItems: number }> {
    let items = [...this.requests.values()];
    if (filter.Decision) items = items.filter((r) => r.Decision === filter.Decision);
    if (filter.RequesterUserId) items = items.filter((r) => r.RequesterUserId === filter.RequesterUserId);
    if (filter.TargetObjectType) items = items.filter((r) => r.TargetObjectType === filter.TargetObjectType);
    if (filter.TargetObjectId) items = items.filter((r) => r.TargetObjectId === filter.TargetObjectId);
    if (filter.Action) items = items.filter((r) => r.Action === filter.Action);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

/** Idempotent control-exception catalog double: Upsert keyed by Code (no duplicate rows). */
export class InMemoryControlExceptionCatalogRepository implements IControlExceptionCatalogRepository {
  private readonly entries = new Map<string, ControlExceptionCatalogEntity>();

  public async FindByCode(code: string): Promise<ControlExceptionCatalogEntity | null> {
    return [...this.entries.values()].find((e) => e.Code === code) ?? null;
  }

  public async List(): Promise<ControlExceptionCatalogEntity[]> {
    return [...this.entries.values()].sort((a, b) => a.Code.localeCompare(b.Code));
  }

  public async Upsert(entity: ControlExceptionCatalogEntity): Promise<ControlExceptionCatalogEntity> {
    const existing = [...this.entries.values()].find((e) => e.Code === entity.Code);
    if (existing) {
      this.entries.delete(existing.Id);
    }
    this.entries.set(entity.Id, entity);
    return entity;
  }
}

/** Idempotent validation-rule catalog double: Upsert keyed by Code (no duplicate rows). */
export class InMemoryValidationRuleCatalogRepository implements IValidationRuleCatalogRepository {
  private readonly entries = new Map<string, ValidationRuleCatalogEntity>();

  public async FindByCode(code: string): Promise<ValidationRuleCatalogEntity | null> {
    return [...this.entries.values()].find((e) => e.Code === code) ?? null;
  }

  public async List(): Promise<ValidationRuleCatalogEntity[]> {
    return [...this.entries.values()].sort((a, b) => a.Code.localeCompare(b.Code));
  }

  public async Upsert(entity: ValidationRuleCatalogEntity): Promise<ValidationRuleCatalogEntity> {
    const existing = [...this.entries.values()].find((e) => e.Code === entity.Code);
    if (existing) {
      this.entries.delete(existing.Id);
    }
    this.entries.set(entity.Id, entity);
    return entity;
  }
}

/** In-memory exception case repository (no Delete — mirrors the port). */
export class InMemoryExceptionCaseRepository implements IExceptionCaseRepository {
  private readonly cases = new Map<string, ExceptionCaseEntity>();

  public async Seed(entity: ExceptionCaseEntity): Promise<void> {
    this.cases.set(entity.Id, entity);
  }

  public async FindById(id: string): Promise<ExceptionCaseEntity | null> {
    return this.cases.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<ExceptionCaseEntity | null> {
    return this.cases.get(id) ?? null;
  }

  public async Create(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    this.cases.set(entity.Id, entity);
    return entity;
  }

  public async Update(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    this.cases.set(entity.Id, entity);
    return entity;
  }

  public async List(
    skip: number,
    take: number,
    filter: ExceptionCaseListFilter = {},
  ): Promise<{ Items: ExceptionCaseEntity[]; TotalItems: number }> {
    let items = [...this.cases.values()];
    if (filter.State) items = items.filter((c) => c.State === filter.State);
    if (filter.ExceptionType) items = items.filter((c) => c.ExceptionType === filter.ExceptionType);
    if (filter.ReferenceType) items = items.filter((c) => c.ReferenceType === filter.ReferenceType);
    if (filter.ReferenceId) items = items.filter((c) => c.ReferenceId === filter.ReferenceId);
    if (filter.WarehouseId) items = items.filter((c) => c.WarehouseId === filter.WarehouseId);
    if (filter.OwnerId) items = items.filter((c) => c.OwnerId === filter.OwnerId);
    if (filter.AssignedToUserId) items = items.filter((c) => c.AssignedToUserId === filter.AssignedToUserId);
    if (filter.Severity) items = items.filter((c) => c.Severity === filter.Severity);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

/** Captures appended audit entries (ignores the transaction manager) for use-case specs. */
export class FakeAuditWriter implements IAuditWriter {
  public readonly Entries: AuditEntry[] = [];

  public async Append(entry: AuditEntry): Promise<void> {
    this.Entries.push(entry);
  }
}

/**
 * Structurally-compatible stand-in for AuditedTransaction: runs the work with a no-op
 * manager and captures the audit entry, so use-case specs can assert the audit without a
 * DB. Cast as `unknown as AuditedTransaction` at the call site.
 */
export class StubAuditedTransaction {
  public readonly Entries: AuditEntry[] = [];

  public async Run<T>(work: (manager: never) => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    const { result, entry } = await work(undefined as never);
    this.Entries.push(entry);
    return result;
  }
}
