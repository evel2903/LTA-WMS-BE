import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';

export const WAREHOUSE_PROFILE_RULE_REPOSITORY = Symbol('IWarehouseProfileRuleRepository');

export interface IWarehouseProfileRuleRepository {
  FindById(id: string): Promise<WarehouseProfileRuleEntity | null>;
  FindByProfileAndRule(
    warehouseProfileId: string,
    ruleDefinitionId: string,
  ): Promise<WarehouseProfileRuleEntity | null>;
  Create(binding: WarehouseProfileRuleEntity): Promise<WarehouseProfileRuleEntity>;
  Delete(id: string): Promise<void>;
  ListByProfile(
    warehouseProfileId: string,
    skip: number,
    take: number,
  ): Promise<{ Items: WarehouseProfileRuleEntity[]; TotalItems: number }>;
}
