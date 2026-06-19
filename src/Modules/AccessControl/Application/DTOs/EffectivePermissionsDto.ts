import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';

export interface EffectivePermissionEntry {
  Action: ActionCode;
  ObjectType: ObjectType;
  PermissionCode: string;
}

export interface EffectivePermissionsDto {
  UserId: string;
  Roles: RoleCode[];
  Permissions: EffectivePermissionEntry[];
}
