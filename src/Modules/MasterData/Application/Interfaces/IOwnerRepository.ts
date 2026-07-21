import { EntityManager } from 'typeorm';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const OWNER_REPOSITORY = Symbol('OWNER_REPOSITORY');

export interface OwnerListFilter {
  OwnerCode?: string;
  OwnerName?: string;
  Status?: MasterDataStatus;
  Search?: string;
}

export interface IOwnerRepository {
  FindById(id: string): Promise<OwnerEntity | null>;
  FindByCode(ownerCode: string): Promise<OwnerEntity | null>;
  Create(owner: OwnerEntity, manager?: EntityManager): Promise<OwnerEntity>;
  Update(owner: OwnerEntity, manager?: EntityManager): Promise<OwnerEntity>;
  List(skip: number, take: number, filter?: OwnerListFilter): Promise<{ Items: OwnerEntity[]; TotalItems: number }>;
}
