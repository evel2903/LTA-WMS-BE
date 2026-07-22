import { EntityManager } from 'typeorm';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';

export const ROLE_CATALOG_REPOSITORY = Symbol('IRoleCatalogRepository');

export interface RoleCatalogSnapshot {
  Version: string;
  Items: RoleEntity[];
  TotalItems: number;
}

export interface IRoleCatalogRepository {
  ReadPage(page: number, pageSize: number): Promise<RoleCatalogSnapshot>;
  Bump(manager: EntityManager): Promise<string>;
  CreateIfAbsentAndBump(role: RoleEntity): Promise<boolean>;
  DeleteUnassigned(roleId: string, manager: EntityManager): Promise<RoleEntity | null>;
}
