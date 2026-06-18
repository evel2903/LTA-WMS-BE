import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';

export const RULE_DEFINITION_REPOSITORY = Symbol('IRuleDefinitionRepository');

export type RuleDefinitionListFilter = {
  RuleGroupId?: string;
  PrecedenceTier?: RulePrecedenceTier;
  ControlMode?: RuleControlMode;
  Status?: RuleStatus;
  WarehouseTypeCode?: string;
  WarehouseId?: string;
};

export interface IRuleDefinitionRepository {
  FindById(id: string): Promise<RuleDefinitionEntity | null>;
  FindByCode(ruleCode: string): Promise<RuleDefinitionEntity | null>;
  Create(definition: RuleDefinitionEntity): Promise<RuleDefinitionEntity>;
  List(
    skip: number,
    take: number,
    filter?: RuleDefinitionListFilter,
  ): Promise<{ Items: RuleDefinitionEntity[]; TotalItems: number }>;
}
