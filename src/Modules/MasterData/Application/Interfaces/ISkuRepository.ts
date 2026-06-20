import { EntityManager } from 'typeorm';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

export const SKU_REPOSITORY = Symbol('SKU_REPOSITORY');

export interface SkuListFilter {
  SkuCode?: string;
  SkuName?: string;
  DefaultOwnerId?: string;
  ItemClass?: string;
  ItemStatus?: SkuStatus;
}

export interface ISkuRepository {
  FindById(id: string): Promise<SkuEntity | null>;
  FindByCode(skuCode: string): Promise<SkuEntity | null>;
  Create(sku: SkuEntity, manager?: EntityManager): Promise<SkuEntity>;
  Update(sku: SkuEntity, manager?: EntityManager): Promise<SkuEntity>;
  List(skip: number, take: number, filter?: SkuListFilter): Promise<{ Items: SkuEntity[]; TotalItems: number }>;
}
