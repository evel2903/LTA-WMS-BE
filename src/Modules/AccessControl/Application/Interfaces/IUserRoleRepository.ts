import { EntityManager } from 'typeorm';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';

export const USER_ROLE_REPOSITORY = Symbol('IUserRoleRepository');

export interface IUserRoleRepository {
  FindByUserId(userId: string): Promise<UserRoleEntity[]>;
  FindByUserAndRole(userId: string, roleId: string): Promise<UserRoleEntity | null>;
  Create(userRole: UserRoleEntity, manager?: EntityManager): Promise<UserRoleEntity>;
  Delete(id: string, manager?: EntityManager): Promise<void>;
}
