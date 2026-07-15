import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { PermissionDto } from '@modules/AccessControl/Application/DTOs/PermissionDto';

export interface RoleDto {
  Id: string;
  RoleCode: string;
  RoleName: string;
  Description: string | null;
  IsSystem: boolean;
  Status: RoleStatus;
  Permissions?: PermissionDto[];
}

export interface CreateRoleDto {
  RoleCode: string;
  RoleName: string;
  Description?: string | null;
  ActorUserId?: string;
}

export interface UpdateRoleDto {
  Id: string;
  RoleName?: string;
  Description?: string | null;
  Status?: RoleStatus;
  ActorUserId?: string;
}

export interface PermissionPairInput {
  Action: ActionCode;
  ObjectType: ObjectType;
}

export interface SetRolePermissionsDto {
  Id: string;
  Permissions: PermissionPairInput[];
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: unknown[];
  ActorUserId?: string;
}

export interface ResetRolePermissionsDto {
  Id: string;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: unknown[];
  ActorUserId?: string;
}

/** PUT/reset response body (contract §4 AC3/AC4) -- effective set only, no role metadata. */
export interface EffectivePermissionsDto {
  Permissions: PermissionPairInput[];
}
