import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';

export const ROLE_REPOSITORY = Symbol('IRoleRepository');

export interface IRoleRepository {
  FindById(id: string): Promise<RoleEntity | null>;
  FindByCode(roleCode: RoleCode): Promise<RoleEntity | null>;
  FindByIds(ids: string[]): Promise<RoleEntity[]>;
  Create(role: RoleEntity): Promise<RoleEntity>;
  List(skip: number, take: number): Promise<{ Items: RoleEntity[]; TotalItems: number }>;
}
