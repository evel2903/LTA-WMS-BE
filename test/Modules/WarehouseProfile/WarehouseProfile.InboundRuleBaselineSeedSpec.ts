import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  SeedInboundRuleBaseline,
  InboundRuleBaselineEntries,
  InboundBaselineWarehouseTypeCode,
  InboundBaselineProfileCode,
} from '@modules/WarehouseProfile/Application/Services/InboundRuleBaselineSeed';
import { SeedRuleGroupCatalog } from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import {
  InMemoryRuleGroupRepository,
  InMemoryRuleDefinitionRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';

/**
 * Mirrors the REAL seeded WP-LTA-HCM-DEMO shape (DemoDataCcFoundationSeed.ts), which sets both
 * WarehouseId AND OwnerId to real non-null values — not the wildcard (null) shape. This matters:
 * RuleResolver.ResolveActiveProfile/AxesMatch requires the caller's context to supply a value for
 * EVERY non-null scope axis the profile has (WarehouseId AND OwnerId here), not just
 * WarehouseTypeCode. A test double that leaves these null/undefined masks a real production bug —
 * verified live against Postgres: Resolve({WarehouseTypeCode:'WT-01'}) alone returns Winner=null
 * against the real profile; only WarehouseTypeCode+WarehouseId+OwnerId together resolve it.
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

describe('Inbound rule baseline seed', () => {
  it('defines one baseline entry for each of the six decision points, covering R-INBOUND, R-PUT and R-COM', () => {
    const groupCodes = InboundRuleBaselineEntries.map((e) => e.RuleGroupCode);
    expect(InboundRuleBaselineEntries.length).toBe(6);
    expect(groupCodes.filter((c) => c === 'R-INBOUND').length).toBe(4);
    expect(groupCodes.filter((c) => c === 'R-PUT').length).toBe(1);
    expect(groupCodes.filter((c) => c === 'R-COM').length).toBe(1);
  });

  it('scopes every baseline rule to compliance tier for R-COM and non-compliance tiers elsewhere', () => {
    for (const entry of InboundRuleBaselineEntries) {
      if (entry.RuleGroupCode === 'R-COM') {
        expect(entry.PrecedenceTier).toBe('COMPLIANCE');
      } else {
        expect(entry.PrecedenceTier).not.toBe('COMPLIANCE');
      }
    }
  });

  it('skips silently (ProfileMissing) when the WT-01 demo profile does not exist yet', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();

    const result = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    expect(result.ProfileMissing).toBe(true);
    expect(result.DefinitionsCreated).toBe(0);
    expect(result.BindingsCreated).toBe(0);
  });

  it('reports RuleGroupMissing per entry when a required rule group is not seeded (e.g. R-PUT not seeded)', async () => {
    const groups = new InMemoryRuleGroupRepository();
    // Seed only the core groups, deliberately skip SeedRuleGroupCatalog to simulate R-PUT missing.
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-INBOUND',
        GroupName: 'Inbound Rules',
        CatalogState: RuleGroupCatalogState.Active,
        DisplayOrder: 100,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-COM',
        GroupName: 'Compliance Rules',
        CatalogState: RuleGroupCatalogState.Active,
        DisplayOrder: 30,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    await profiles.Create(BuildDemoProfile());

    const result = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    expect(result.RuleGroupMissing).toEqual(['R-PUT']);
    // R-INBOUND (4 rules) + R-COM (1 rule) still get created; only R-PUT's rule is skipped.
    expect(result.DefinitionsCreated).toBe(5);
    expect(result.BindingsCreated).toBe(5);
  });

  it('deduplicates RuleGroupMissing when multiple entries share the same missing group (R-INBOUND has 4)', async () => {
    const groups = new InMemoryRuleGroupRepository();
    // Only seed R-PUT/R-COM; leave R-INBOUND entirely unseeded so all 4 R-INBOUND entries miss.
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-PUT',
        GroupName: 'Putaway Rules',
        CatalogState: RuleGroupCatalogState.Active,
        DisplayOrder: 105,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-COM',
        GroupName: 'Compliance Rules',
        CatalogState: RuleGroupCatalogState.Active,
        DisplayOrder: 30,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    await profiles.Create(BuildDemoProfile());

    const result = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    expect(result.RuleGroupMissing).toEqual(['R-INBOUND']);
    expect(result.DefinitionsCreated).toBe(2);
    expect(result.BindingsCreated).toBe(2);
  });

  it('reports RuleGroupNotActive (not RuleGroupMissing) and does not bind when a group exists but is still PLACEHOLDER', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-INBOUND',
        GroupName: 'Inbound Rules',
        CatalogState: RuleGroupCatalogState.Placeholder, // not yet promoted to Active
        DisplayOrder: 100,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-PUT',
        GroupName: 'Putaway Rules',
        CatalogState: RuleGroupCatalogState.Active,
        DisplayOrder: 105,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    await groups.Create(
      new RuleGroupEntity({
        Id: randomUUID(),
        GroupCode: 'R-COM',
        GroupName: 'Compliance Rules',
        CatalogState: RuleGroupCatalogState.Active,
        DisplayOrder: 30,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    await profiles.Create(BuildDemoProfile());

    const result = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    expect(result.RuleGroupMissing).toEqual([]);
    expect(result.RuleGroupNotActive).toEqual(['R-INBOUND']);
    // Only R-PUT (1) + R-COM (1) get created; the 4 R-INBOUND entries are skipped, not bound.
    expect(result.DefinitionsCreated).toBe(2);
    expect(result.BindingsCreated).toBe(2);
    const definitionList = await definitions.List(0, 100, {});
    expect(
      definitionList.Items.some(
        (d) =>
          d.RuleCode.startsWith('RULE-IN-') || d.RuleCode === 'RULE-QC-TRIG-01' || d.RuleCode === 'RULE-LPN-REQ-01',
      ),
    ).toBe(false);
  });

  it('seeds all six baseline rule definitions and bindings into a fully-seeded repository set', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const profile = BuildDemoProfile();
    await profiles.Create(profile);

    const result = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    expect(result.ProfileMissing).toBe(false);
    expect(result.RuleGroupMissing).toEqual([]);
    expect(result.DefinitionsCreated).toBe(6);
    expect(result.BindingsCreated).toBe(6);

    const definitionList = await definitions.List(0, 100, {});
    expect(definitionList.TotalItems).toBe(6);
    expect(definitionList.Items.every((d) => d.WarehouseTypeCode === InboundBaselineWarehouseTypeCode)).toBe(true);
    expect(definitionList.Items.every((d) => d.ScopeKey.length > 0)).toBe(true);

    const bindingList = await bindings.ListByProfile(profile.Id, 0, 100);
    expect(bindingList.TotalItems).toBe(6);
    expect(bindingList.Items.every((b) => b.IsEnabled)).toBe(true);
  });

  it('is idempotent: re-running does not create duplicates and does not throw', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const profile = BuildDemoProfile();
    await profiles.Create(profile);

    await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);
    const second = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    expect(second.DefinitionsCreated).toBe(0);
    expect(second.BindingsCreated).toBe(0);

    const definitionList = await definitions.List(0, 100, {});
    expect(definitionList.TotalItems).toBe(6);
  });

  it('converges instead of throwing when Create() races a concurrent run (TOCTOU: ConflictException on the unique index)', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const definitions = new InMemoryRuleDefinitionRepository();
    // Wrap Create to simulate a concurrent process winning the race on the FIRST rule only: throw
    // ConflictException as the real TypeORM repository would on a unique-index violation, but only
    // after actually inserting the row into the underlying store (mirroring what really happened).
    let conflictInjected = false;
    const originalCreate = definitions.Create.bind(definitions);
    definitions.Create = async (definition) => {
      if (!conflictInjected) {
        conflictInjected = true;
        await originalCreate(definition); // the "concurrent" process's write lands first
        throw new ConflictException('Rule code already exists');
      }
      return originalCreate(definition);
    };
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    await profiles.Create(BuildDemoProfile());

    const result = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    // Converged: the racing Create's row is picked up via FindByCode, not re-thrown, and all 6
    // still end up created (5 by this run, 1 by the simulated concurrent run) and bound.
    expect(result.DefinitionsCreated).toBe(5);
    expect(result.BindingsCreated).toBe(6);
    const definitionList = await definitions.List(0, 100, {});
    expect(definitionList.TotalItems).toBe(6);
  });

  it('does not bind any rule to a rule group left at CatalogState=PLACEHOLDER', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const profile = BuildDemoProfile();
    await profiles.Create(profile);

    await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);

    const definitionList = await definitions.List(0, 100, {});
    for (const definition of definitionList.Items) {
      const group = await groups.FindById(definition.RuleGroupId);
      expect(group?.CatalogState).toBe(RuleGroupCatalogState.Active);
    }
  });

  describe('IRuleResolver.Resolve returns non-empty decisions (AC5, real resolver — not mocked)', () => {
    const buildResolver = async () => {
      const groups = new InMemoryRuleGroupRepository();
      await SeedRuleGroupCatalog(groups);
      const definitions = new InMemoryRuleDefinitionRepository();
      const bindings = new InMemoryWarehouseProfileRuleRepository();
      const profiles = new InMemoryWarehouseProfileRepository();
      const profile = BuildDemoProfile();
      await profiles.Create(profile);

      const seedResult = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);
      expect(seedResult.DefinitionsCreated).toBe(6);

      const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
      // Real callers (IRE-01's InboundRuleGate/PutawayRuleGate) MUST resolve and pass WarehouseId
      // AND OwnerId, matching the target profile's scope — WarehouseTypeCode alone is NOT enough
      // once a profile is scoped that specifically (see BuildDemoProfile comment above).
      const scopedContext = {
        WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
        WarehouseId: profile.WarehouseId!,
        OwnerId: profile.OwnerId!,
      };
      return { resolver, profile, scopedContext };
    };

    it('#1 gate-in readiness: missing appointment resolves to RULE-IN-GATE-01 (APPROVAL_REQUIRED)', async () => {
      const { resolver, scopedContext } = await buildResolver();
      const decision = await resolver.Resolve({ ...scopedContext, Attributes: { hasAppointment: false } });
      expect(decision.Winner?.RuleCode).toBe('RULE-IN-GATE-01');
      expect(decision.ApprovalRequired).toBe(true);
    });

    it('#2 over/under tolerance: overUnderPct above threshold resolves to RULE-IN-TOL-01 (APPROVAL_REQUIRED)', async () => {
      const { resolver, scopedContext } = await buildResolver();
      const decision = await resolver.Resolve({ ...scopedContext, Attributes: { overUnderPct: 12 } });
      expect(decision.Winner?.RuleCode).toBe('RULE-IN-TOL-01');
      expect(decision.ApprovalRequired).toBe(true);
    });

    it('#3 QC trigger: high supplier risk resolves to RULE-QC-TRIG-01 (APPROVAL_REQUIRED)', async () => {
      const { resolver, scopedContext } = await buildResolver();
      const decision = await resolver.Resolve({ ...scopedContext, Attributes: { supplierRisk: 'high' } });
      expect(decision.Winner?.RuleCode).toBe('RULE-QC-TRIG-01');
      expect(decision.ApprovalRequired).toBe(true);
    });

    it('#4 LPN requirement: lpnControlled without a scanned LPN resolves to RULE-LPN-REQ-01 (HARD_BLOCK)', async () => {
      const { resolver, scopedContext } = await buildResolver();
      const decision = await resolver.Resolve({ ...scopedContext, Attributes: { lpnControlled: true, hasLpn: false } });
      expect(decision.Winner?.RuleCode).toBe('RULE-LPN-REQ-01');
      expect(decision.Allowed).toBe(false);
    });

    it('#5 directed putaway eligibility: available capacity resolves to RULE-PUT-ELIG-01 (AUTO_SUGGESTION)', async () => {
      const { resolver, scopedContext } = await buildResolver();
      const decision = await resolver.Resolve({ ...scopedContext, Attributes: { capacityAvailable: true } });
      expect(decision.Winner?.RuleCode).toBe('RULE-PUT-ELIG-01');
      expect(decision.Suggestion).toBeDefined();
    });

    it('#6 compliance: temperature excursion resolves to RULE-COM-COLD-01 (HARD_BLOCK, Compliance tier)', async () => {
      const { resolver, scopedContext } = await buildResolver();
      const decision = await resolver.Resolve({ ...scopedContext, Attributes: { tempOutOfRange: true } });
      expect(decision.Winner?.RuleCode).toBe('RULE-COM-COLD-01');
      expect(decision.Winner?.PrecedenceTier).toBe('COMPLIANCE');
      expect(decision.Allowed).toBe(false);
    });

    it('resolves an empty decision (Allowed=true, Winner=null) when no baseline condition matches — backward-compat default', async () => {
      const { resolver, scopedContext } = await buildResolver();
      const decision = await resolver.Resolve({ ...scopedContext, Attributes: {} });
      expect(decision.Winner).toBeNull();
      expect(decision.Allowed).toBe(true);
    });

    it('CRITICAL CONTRACT: resolves an empty decision when the context omits WarehouseId/OwnerId that the profile scopes on — WarehouseTypeCode alone is NOT sufficient', async () => {
      const { resolver } = await buildResolver();
      const decision = await resolver.Resolve({
        WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
        Attributes: { hasAppointment: false },
      });
      // This documents/locks real production behavior (verified live against Postgres): a
      // WarehouseId/OwnerId-scoped profile will NOT resolve from WarehouseTypeCode alone.
      // IRE-01+ context builders must resolve and pass the full scope, not just the warehouse type.
      expect(decision.Winner).toBeNull();
      expect(decision.Allowed).toBe(true);
    });
  });
});
