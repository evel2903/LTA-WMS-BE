import { EntityManager } from 'typeorm';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const UOM_REPOSITORY = Symbol('UOM_REPOSITORY');

export interface UomListFilter {
  UomCode?: string;
  UomName?: string;
  UomType?: string;
  Status?: MasterDataStatus;
  Search?: string;
}

export interface IUomRepository {
  FindById(id: string): Promise<UomEntity | null>;
  FindByCode(uomCode: string): Promise<UomEntity | null>;
  Create(uom: UomEntity, manager?: EntityManager): Promise<UomEntity>;
  Update(uom: UomEntity, manager?: EntityManager): Promise<UomEntity>;
  List(skip: number, take: number, filter?: UomListFilter): Promise<{ Items: UomEntity[]; TotalItems: number }>;
}
