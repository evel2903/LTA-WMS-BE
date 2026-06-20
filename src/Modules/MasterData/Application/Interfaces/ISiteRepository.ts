import { EntityManager } from 'typeorm';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const SITE_REPOSITORY = Symbol('ISiteRepository');

export type SiteListFilter = {
  Status?: MasterDataStatus;
  SiteCode?: string;
};

export interface ISiteRepository {
  FindById(id: string): Promise<SiteEntity | null>;
  FindByCode(siteCode: string): Promise<SiteEntity | null>;
  Create(site: SiteEntity, manager?: EntityManager): Promise<SiteEntity>;
  Update(site: SiteEntity, manager?: EntityManager): Promise<SiteEntity>;
  List(skip: number, take: number, filter?: SiteListFilter): Promise<{ Items: SiteEntity[]; TotalItems: number }>;
}
