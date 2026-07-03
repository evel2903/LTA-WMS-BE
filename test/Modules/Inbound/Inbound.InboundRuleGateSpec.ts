import { randomUUID } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { InboundRuleGate, InboundRuleAttributeKeys } from '@modules/Inbound/Application/Services/InboundRuleGate';
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
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  InMemoryRuleGroupRepository,
  InMemoryRuleDefinitionRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import { InMemoryWarehouseRepository } from '@test/TestDoubles/MasterData/MasterDataTestDoubles';

/**
 * Mirrors WarehouseProfile.InboundRuleBaselineSeedSpec.ts's BuildDemoProfile: WarehouseId AND
 * OwnerId are real non-null values, matching the real WP-LTA-HCM-DEMO shape — a wildcard (null)
 * profile would mask the CRITICAL IRE-00 bug (adapter must pass both axes, not just
 * WarehouseTypeCode) that this spec exists to guard against regressing.
 */
const BuildDemoProfile = (): WarehouseProfileEntity => {
  const now = new Date('2026-07-01T00:00:00.000Z');
  return new WarehouseProfileEntity({
    Id: randomUUID(),
    ProfileCode: InboundBaselineProfileCode,
    ProfileName: 'Cấu hình demo Kho LTA HCM',
    WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
    WarehouseId: randomUUID(),
    OwnerId: randomUUID(),
    Version: 1,
    Status: WarehouseProfileStatus.Active,
    ScopeKey: 'test-scope-key',
    EffectiveFrom: now,
    CreatedAt: now,
    UpdatedAt: now,
  });
};

class ThrowingRuleResolver implements IRuleResolver {
  public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
    void context;
    throw new Error('rule engine unavailable');
  }
}

const BuildWarehouse = (id: string): WarehouseEntity => {
  const now = new Date();
  return new WarehouseEntity({
    Id: id,
    SiteId: randomUUID(),
    WarehouseCode: 'WH-WT01-DEMO',
    WarehouseName: 'Kho demo WT-01',
    WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });
};

describe('InboundRuleGate (real RuleResolver, seeded WT-01 baseline — AC1/AC2/AC3/AC5)', () => {
  const buildGate = async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const profile = BuildDemoProfile();
    await profiles.Create(profile);
    const seedResult = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);
    expect(seedResult.DefinitionsCreated).toBe(8);

    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(BuildWarehouse(profile.WarehouseId!));

    const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
    const gate = new InboundRuleGate(resolver, warehouses);
    return { gate, profile, warehouses };
  };

  it('AC2: throws BusinessRuleException (ControlMode=HARD_BLOCK) when the winning rule is HardBlock (RULE-LPN-REQ-01)', async () => {
    const { gate, profile } = await buildGate();

    let caught: unknown;
    try {
      await gate.Evaluate({
        WarehouseId: profile.WarehouseId,
        OwnerId: profile.OwnerId,
        Attributes: {
          [InboundRuleAttributeKeys.LpnControlled]: true,
          [InboundRuleAttributeKeys.HasLpn]: false,
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      ControlMode: 'HARD_BLOCK',
      RuleCode: 'RULE-LPN-REQ-01',
      ApprovalRequired: false,
    });
  });

  it('AC2: throws BusinessRuleException (ControlMode=APPROVAL_REQUIRED) when the winning rule is ApprovalRequired (RULE-IN-GATE-01) — always blocks, does not silently pass', async () => {
    const { gate, profile } = await buildGate();

    let caught: unknown;
    try {
      await gate.Evaluate({
        WarehouseId: profile.WarehouseId,
        OwnerId: profile.OwnerId,
        Attributes: { [InboundRuleAttributeKeys.HasAppointment]: false },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      ControlMode: 'APPROVAL_REQUIRED',
      RuleCode: 'RULE-IN-GATE-01',
      ApprovalRequired: true,
    });
  });

  it('AC2: returns a no-op outcome when the context is valid but no seeded rule condition matches (empty decision, Allowed=true)', async () => {
    const { gate, profile } = await buildGate();

    const outcome = await gate.Evaluate({
      WarehouseId: profile.WarehouseId,
      OwnerId: profile.OwnerId,
      Attributes: {},
    });

    expect(outcome).toEqual({});
  });

  it('AC1: returns a no-op outcome (does not call the resolver) when WarehouseId is null/undefined', async () => {
    const { gate } = await buildGate();

    expect(await gate.Evaluate({ WarehouseId: null })).toEqual({});
    expect(await gate.Evaluate({ WarehouseId: undefined })).toEqual({});
  });

  it('AC1: returns a no-op outcome when WarehouseId does not resolve to a warehouse (bad/unknown id)', async () => {
    const { gate } = await buildGate();

    const outcome = await gate.Evaluate({ WarehouseId: randomUUID() });

    expect(outcome).toEqual({});
  });

  it('AC5: propagates a resolver failure unchanged (fail-closed) — never swallowed into a no-op outcome', async () => {
    const warehouseId = randomUUID();
    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(BuildWarehouse(warehouseId));
    const gate = new InboundRuleGate(new ThrowingRuleResolver(), warehouses);

    await expect(gate.Evaluate({ WarehouseId: warehouseId })).rejects.toThrow('rule engine unavailable');
  });

  it('IRE-06 regression guard: Decide() still returns an empty decision (ADR-5 backward-compat) when WarehouseId does not resolve — #1-#4 must NOT fail-closed like PutawayRuleGate does', async () => {
    const { gate } = await buildGate();

    const decision = await gate.Decide({ WarehouseId: randomUUID() });

    expect(decision).toMatchObject({ Matched: false, Blocked: false, ApprovalRequired: false });
  });
});
