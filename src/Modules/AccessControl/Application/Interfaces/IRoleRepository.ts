import { EntityManager } from 'typeorm';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';

export const ROLE_REPOSITORY = Symbol('IRoleRepository');

export interface IRoleRepository {
  FindById(id: string): Promise<RoleEntity | null>;
  /** Locked read (pessimistic_write) for the set/reset-permissions transaction — closes the diff race. */
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<RoleEntity | null>;
  FindByCode(roleCode: string): Promise<RoleEntity | null>;
  FindByIds(ids: string[]): Promise<RoleEntity[]>;
  Create(role: RoleEntity, manager?: EntityManager): Promise<RoleEntity>;
  Update(role: RoleEntity, manager?: EntityManager): Promise<RoleEntity>;
  List(skip: number, take: number): Promise<{ Items: RoleEntity[]; TotalItems: number }>;
}
