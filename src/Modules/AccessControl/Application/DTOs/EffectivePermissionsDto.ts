import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export interface EffectivePermissionEntry {
  Action: ActionCode;
  ObjectType: ObjectType;
  PermissionCode: string;
}

export interface EffectivePermissionsDto {
  UserId: string;
  /** RH-04 (RH-ASG-01 / D3, AC7): the user's per-user assignment `EffectiveVersion` as a canonical
   * decimal string (BIGINT), always present ('0' when the user has no ledger row yet). Note `Roles`
   * are the ACTIVE effective roles — NOT assignment proof (a Role.Status change does not bump this). */
  EffectiveVersion: string;
  Roles: string[];
  Permissions: EffectivePermissionEntry[];
}
