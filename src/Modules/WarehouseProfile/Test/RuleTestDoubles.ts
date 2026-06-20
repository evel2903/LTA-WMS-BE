import { ConflictException } from '@common/Exceptions/AppException';
import {
  IRuleGroupRepository,
  RuleGroupListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import {
  IRuleDefinitionRepository,
  RuleDefinitionListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import {
  IOverrideLogRepository,
  OverrideLogListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IOverrideLogRepository';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';
import { OverrideLogEntity } from '@modules/WarehouseProfile/Domain/Entities/OverrideLogEntity';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

/**
 * Deterministic IRuleResolver double: returns a fixed RuleDecision and records the last context it
 * was asked to resolve. Used by B4/B5 specs to drive the preview without a DB or a real resolver.
 */
export class StubRuleResolver implements IRuleResolver {
  public LastContext: RuleEvaluationContext | null = null;

  constructor(private readonly decision: RuleDecision) {}

  public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
    this.LastContext = context;
    return this.decision;
  }
}

export class InMemoryRuleGroupRepository implements IRuleGroupRepository {
  private readonly groups = new Map<string, RuleGroupEntity>();

  public async FindById(id: string): Promise<RuleGroupEntity | null> {
    return this.groups.get(id) ?? null;
  }

  public async FindByCode(groupCode: string): Promise<RuleGroupEntity | null> {
    return [...this.groups.values()].find((group) => group.GroupCode === groupCode) ?? null;
  }

  public async Create(group: RuleGroupEntity): Promise<RuleGroupEntity> {
    if ([...this.groups.values()].some((existing) => existing.GroupCode === group.GroupCode)) {
      throw new ConflictException('Rule group code already exists');
    }
    this.groups.set(group.Id, group);
    return group;
  }

  public async List(
    skip: number,
    take: number,
    filter: RuleGroupListFilter = {},
  ): Promise<{ Items: RuleGroupEntity[]; TotalItems: number }> {
    let items = [...this.groups.values()];
    if (filter.CatalogState) items = items.filter((group) => group.CatalogState === filter.CatalogState);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class InMemoryRuleDefinitionRepository implements IRuleDefinitionRepository {
  private readonly definitions = new Map<string, RuleDefinitionEntity>();

  public async FindById(id: string): Promise<RuleDefinitionEntity | null> {
    return this.definitions.get(id) ?? null;
  }

  public async FindByCode(ruleCode: string): Promise<RuleDefinitionEntity | null> {
    return [...this.definitions.values()].find((definition) => definition.RuleCode === ruleCode) ?? null;
  }

  public async Create(definition: RuleDefinitionEntity): Promise<RuleDefinitionEntity> {
    if ([...this.definitions.values()].some((existing) => existing.RuleCode === definition.RuleCode)) {
      throw new ConflictException('Rule code already exists');
    }
    this.definitions.set(definition.Id, definition);
    return definition;
  }

  public async List(
    skip: number,
    take: number,
    filter: RuleDefinitionListFilter = {},
  ): Promise<{ Items: RuleDefinitionEntity[]; TotalItems: number }> {
    let items = [...this.definitions.values()];
    if (filter.RuleGroupId) items = items.filter((definition) => definition.RuleGroupId === filter.RuleGroupId);
    if (filter.PrecedenceTier)
      items = items.filter((definition) => definition.PrecedenceTier === filter.PrecedenceTier);
    if (filter.ControlMode) items = items.filter((definition) => definition.ControlMode === filter.ControlMode);
    if (filter.Status) items = items.filter((definition) => definition.Status === filter.Status);
    if (filter.WarehouseTypeCode)
      items = items.filter((definition) => definition.WarehouseTypeCode === filter.WarehouseTypeCode);
    if (filter.WarehouseId) items = items.filter((definition) => definition.WarehouseId === filter.WarehouseId);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

export class InMemoryWarehouseProfileRuleRepository implements IWarehouseProfileRuleRepository {
  private readonly bindings = new Map<string, WarehouseProfileRuleEntity>();

  public async FindById(id: string): Promise<WarehouseProfileRuleEntity | null> {
    return this.bindings.get(id) ?? null;
  }

  public async FindByProfileAndRule(
    warehouseProfileId: string,
    ruleDefinitionId: string,
  ): Promise<WarehouseProfileRuleEntity | null> {
    return (
      [...this.bindings.values()].find(
        (binding) => binding.WarehouseProfileId === warehouseProfileId && binding.RuleDefinitionId === ruleDefinitionId,
      ) ?? null
    );
  }

  public async Create(binding: WarehouseProfileRuleEntity): Promise<WarehouseProfileRuleEntity> {
    if (
      [...this.bindings.values()].some(
        (existing) =>
          existing.WarehouseProfileId === binding.WarehouseProfileId &&
          existing.RuleDefinitionId === binding.RuleDefinitionId,
      )
    ) {
      throw new ConflictException('Rule is already bound to this profile');
    }
    this.bindings.set(binding.Id, binding);
    return binding;
  }

  public async Delete(id: string): Promise<void> {
    this.bindings.delete(id);
  }

  public async ListByProfile(
    warehouseProfileId: string,
    skip: number,
    take: number,
  ): Promise<{ Items: WarehouseProfileRuleEntity[]; TotalItems: number }> {
    const items = [...this.bindings.values()].filter((binding) => binding.WarehouseProfileId === warehouseProfileId);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

/** Append-only in-memory override_logs double (C7): no Update/Delete, frequency-filtered List. */
export class InMemoryOverrideLogRepository implements IOverrideLogRepository {
  private readonly logs = new Map<string, OverrideLogEntity>();

  public async Seed(log: OverrideLogEntity): Promise<void> {
    this.logs.set(log.Id, log);
  }

  public async Create(entity: OverrideLogEntity): Promise<OverrideLogEntity> {
    this.logs.set(entity.Id, entity);
    return entity;
  }

  public async FindById(id: string): Promise<OverrideLogEntity | null> {
    return this.logs.get(id) ?? null;
  }

  public async List(
    skip: number,
    take: number,
    filter: OverrideLogListFilter = {},
  ): Promise<{ Items: OverrideLogEntity[]; TotalItems: number }> {
    let items = [...this.logs.values()];
    if (filter.RuleId) items = items.filter((log) => log.RuleId === filter.RuleId);
    if (filter.ActorUserId) items = items.filter((log) => log.ActorUserId === filter.ActorUserId);
    if (filter.TargetObjectType) items = items.filter((log) => log.TargetObjectType === filter.TargetObjectType);
    if (filter.TargetObjectId) items = items.filter((log) => log.TargetObjectId === filter.TargetObjectId);
    if (filter.From) items = items.filter((log) => log.CreatedAt.getTime() >= filter.From!.getTime());
    if (filter.To) items = items.filter((log) => log.CreatedAt.getTime() <= filter.To!.getTime());
    items.sort((a, b) => b.CreatedAt.getTime() - a.CreatedAt.getTime());
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}
