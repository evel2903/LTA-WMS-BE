import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export interface EffectivePermissionEntry {
  Action: ActionCode;
  ObjectType: ObjectType;
  PermissionCode: string;
}

export interface EffectivePermissionsDto {
  UserId: string;
  Roles: string[];
  Permissions: EffectivePermissionEntry[];
}
