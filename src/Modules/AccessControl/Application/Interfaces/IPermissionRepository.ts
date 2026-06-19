import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';

export const PERMISSION_REPOSITORY = Symbol('IPermissionRepository');

export interface PermissionListFilter {
  Action?: ActionCode;
  ObjectType?: ObjectType;
}

export interface IPermissionRepository {
  FindById(id: string): Promise<PermissionEntity | null>;
  FindByCode(permissionCode: string): Promise<PermissionEntity | null>;
  FindByIds(ids: string[]): Promise<PermissionEntity[]>;
  Create(permission: PermissionEntity): Promise<PermissionEntity>;
  List(
    skip: number,
    take: number,
    filter?: PermissionListFilter,
  ): Promise<{ Items: PermissionEntity[]; TotalItems: number }>;
}
