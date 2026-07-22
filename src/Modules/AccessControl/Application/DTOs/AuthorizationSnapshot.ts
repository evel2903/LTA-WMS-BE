import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';

export interface AuthorizationSnapshotRole {
  Id: string;
  RoleCode: string;
}

export interface AuthorizationSnapshotPermission {
  Action: ActionCode;
  ObjectType: ObjectType;
}

export interface AuthorizationSnapshotDataScope {
  PrincipalType: PrincipalType;
  PrincipalId: string;
  ScopeType: DataScopeType;
  ScopeValueId: string | null;
  IncludeAll: boolean;
}

/** One authoritative, transactionally consistent RBAC view for a request actor. */
export interface AuthorizationSnapshot {
  UserId: string;
  ActiveRoles: AuthorizationSnapshotRole[];
  Permissions: AuthorizationSnapshotPermission[];
  DataScopes: AuthorizationSnapshotDataScope[];
}

/** Canonical audit identity: unique role codes in PostgreSQL/C byte order. */
export function AuthorizationSnapshotRoleCodes(snapshot: AuthorizationSnapshot): string[] {
  return [...new Set(snapshot.ActiveRoles.map((role) => role.RoleCode))].sort((left, right) =>
    Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')),
  );
}
