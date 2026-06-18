import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const PACK_DEFINITION_REPOSITORY = Symbol('PACK_DEFINITION_REPOSITORY');

export interface PackDefinitionListFilter {
  SkuId?: string;
  UomId?: string;
  PackCode?: string;
  Status?: MasterDataStatus;
}

export interface IPackDefinitionRepository {
  FindById(id: string): Promise<PackDefinitionEntity | null>;
  FindBySkuAndPackCode(skuId: string, packCode: string): Promise<PackDefinitionEntity | null>;
  FindActiveDefaultBySkuId(skuId: string): Promise<PackDefinitionEntity | null>;
  Create(packDefinition: PackDefinitionEntity): Promise<PackDefinitionEntity>;
  Update(packDefinition: PackDefinitionEntity): Promise<PackDefinitionEntity>;
  List(
    skip: number,
    take: number,
    filter?: PackDefinitionListFilter,
  ): Promise<{ Items: PackDefinitionEntity[]; TotalItems: number }>;
}
