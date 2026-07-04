import { randomUUID } from 'crypto';
import { PutawayRuleGate } from '@modules/InventoryExecution/Application/Services/PutawayRuleGate';
import {
  SeedInboundRuleBaseline,
  InboundBaselineWarehouseTypeCode,
  InboundBaselineProfileCode,
} from '@modules/WarehouseProfile/Application/Services/InboundRuleBaselineSeed';
import { SeedRuleGroupCatalog } from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  InMemoryRuleGroupRepository,
  InMemoryRuleDefinitionRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import { InMemoryWarehouseRepository } from '@test/TestDoubles/MasterData/MasterDataTestDoubles';

/** WT-01 demo warehouse matching InboundBaselineWarehouseTypeCode — shared by PutawayRuleGate specs. */
export const MakePutawayDemoWarehouse = (id: string): WarehouseEntity =>
  new WarehouseEntity({
    Id: id,
    SiteId: randomUUID(),
    WarehouseCode: 'WH-WT01-DEMO',
    WarehouseName: 'Kho demo WT-01',
    WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
    Status: MasterDataStatus.Active,
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
  });

/** PutawayRuleGate with NO rules seeded — every Decide()/Evaluate() returns an empty decision. */
export const BuildEmptyPutawayRuleGate = (warehouseId: string): PutawayRuleGate => {
  const groups = new InMemoryRuleGroupRepository();
  const definitions = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const profiles = new InMemoryWarehouseProfileRepository();
  const warehouses = new InMemoryWarehouseRepository();
  warehouses.Seed(MakePutawayDemoWarehouse(warehouseId));
  const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
  return new PutawayRuleGate(resolver, warehouses);
};

/**
 * PutawayRuleGate over the WT-01 baseline (IRE-00), bound to a demo profile scoped to
 * warehouseId/ownerId (random ids if not given). EffectiveFrom pinned safely in the past so tests
 * never flip on a machine/CI wall clock (IRE-02 lesson).
 */
export const BuildSeededPutawayRuleGate = async (
  warehouseId: string = randomUUID(),
  ownerId: string = randomUUID(),
): Promise<{
  gate: PutawayRuleGate;
  profile: WarehouseProfileEntity;
  definitions: InMemoryRuleDefinitionRepository;
  resolver: RuleResolver;
  warehouses: InMemoryWarehouseRepository;
}> => {
  const groups = new InMemoryRuleGroupRepository();
  await SeedRuleGroupCatalog(groups);
  const definitions = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const profiles = new InMemoryWarehouseProfileRepository();
  const pinnedAt = new Date('2020-01-01T00:00:00.000Z');
  const profile = new WarehouseProfileEntity({
    Id: randomUUID(),
    ProfileCode: InboundBaselineProfileCode,
    ProfileName: 'Demo WT-01 (test fixture)',
    WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
    WarehouseId: warehouseId,
    OwnerId: ownerId,
    Version: 1,
    Status: WarehouseProfileStatus.Active,
    ScopeKey: `${warehouseId}:${ownerId}`,
    EffectiveFrom: pinnedAt,
    CreatedAt: pinnedAt,
    UpdatedAt: pinnedAt,
  });
  await profiles.Create(profile);
  const seedResult = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);
  if (seedResult.DefinitionsCreated !== 9) {
    throw new Error(`Expected 9 seeded rule definitions, got ${seedResult.DefinitionsCreated}`);
  }
  const warehouses = new InMemoryWarehouseRepository();
  warehouses.Seed(MakePutawayDemoWarehouse(warehouseId));
  const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
  return { gate: new PutawayRuleGate(resolver, warehouses), profile, definitions, resolver, warehouses };
};
