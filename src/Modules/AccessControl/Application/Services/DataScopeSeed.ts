import { randomUUID } from 'crypto';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { IDataScopeRepository } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';

const ADMIN_SCOPE_TYPES: DataScopeType[] = [
  DataScopeType.Warehouse,
  DataScopeType.Zone,
  DataScopeType.Owner,
  DataScopeType.Customer,
];

/**
 * Idempotent: grants WMS_ADMIN an `IncludeAll` row per scope type so the admin role
 * is never scope-blocked. Must run AFTER the RBAC seed (the WMS_ADMIN role must
 * exist). Read-before-write idempotency (IncludeAll rows have null scope_value_id,
 * which the unique constraint treats as distinct).
 */
export async function SeedAdminDataScopes(
  roleRepository: IRoleRepository,
  dataScopeRepository: IDataScopeRepository,
): Promise<void> {
  const admin = await roleRepository.FindByCode(RoleCode.WmsAdmin);
  if (!admin) return;

  const existing = await dataScopeRepository.FindByPrincipal(PrincipalType.Role, admin.Id);
  for (const scopeType of ADMIN_SCOPE_TYPES) {
    if (existing.some((s) => s.ScopeType === scopeType && s.IncludeAll)) continue;
    const now = new Date();
    await dataScopeRepository.Create(
      new DataScopeEntity({
        Id: randomUUID(),
        PrincipalType: PrincipalType.Role,
        PrincipalId: admin.Id,
        ScopeType: scopeType,
        ScopeValueId: null,
        IncludeAll: true,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: 'SEED',
        UpdatedBy: null,
      }),
    );
  }
}
