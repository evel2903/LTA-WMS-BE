import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';

export const RULE_GROUP_REPOSITORY = Symbol('IRuleGroupRepository');

export type RuleGroupListFilter = {
  CatalogState?: RuleGroupCatalogState;
};

export interface IRuleGroupRepository {
  FindById(id: string): Promise<RuleGroupEntity | null>;
  FindByCode(groupCode: string): Promise<RuleGroupEntity | null>;
  Create(group: RuleGroupEntity): Promise<RuleGroupEntity>;
  List(
    skip: number,
    take: number,
    filter?: RuleGroupListFilter,
  ): Promise<{ Items: RuleGroupEntity[]; TotalItems: number }>;
}
