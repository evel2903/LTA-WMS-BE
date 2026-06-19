import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export interface PermissionDto {
  Id: string;
  PermissionCode: string;
  Action: ActionCode;
  ObjectType: ObjectType;
  Description: string | null;
}
