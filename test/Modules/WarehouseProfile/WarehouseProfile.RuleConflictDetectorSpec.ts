import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * AC3: same-scope same-category (same PrecedenceTier + same scope-signature) but divergent
 * ControlMode -> conflict; different tier or different scope -> NOT a conflict; compliance hard
 * block stays the deterministic winner of its conflict group.
 *
 * The detector is a pure, read-only Application service: it consumes the resolver's already-sorted
 * OrderedCandidates (winner first) and never re-resolves or hits I/O.
 */
describe('RuleConflictDetector same-scope same-category detection (AC3)', () => {
  const detector = new RuleConflictDetector();

  it('reports a conflict for two rules with the same tier + same scope but divergent control modes', () => {
    const ruleA = BuildRule({
      RuleCode: 'OWN-A',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    const ruleB = BuildRule({
      RuleCode: 'OWN-B',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });

    // Resolver sort places ruleA first within the group (winner of the group).
    const conflicts = detector.Detect([ruleA, ruleB]);

    expect(conflicts).toHaveLength(1);
    const conflict = conflicts[0];
    expect(conflict.PrecedenceTier).toBe(RulePrecedenceTier.OwnerContract);
    expect(conflict.ScopeKey).toBe(ruleA.ScopeKey);
    expect(conflict.WinnerRuleCode).toBe('OWN-A');
    expect(conflict.Rules.map((rule) => rule.RuleCode).sort()).toEqual(['OWN-A', 'OWN-B']);
    expect(conflict.Rules.map((rule) => rule.ControlMode).sort()).toEqual([
      RuleControlMode.ApprovalRequired,
      RuleControlMode.SoftWarning,
    ]);
  });

  it('does NOT report a conflict when two same-scope rules share the same control mode', () => {
    const ruleA = BuildRule({
      RuleCode: 'OWN-A',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    const ruleB = BuildRule({
      RuleCode: 'OWN-B',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });

    expect(detector.Detect([ruleA, ruleB])).toEqual([]);
  });

  it('does NOT report a conflict for rules in different precedence tiers (cross-tier is a skipped reason, not conflict)', () => {
    const high = BuildRule({
      RuleCode: 'INT-A',
      PrecedenceTier: RulePrecedenceTier.Integrity,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    const low = BuildRule({
      RuleCode: 'OPT-A',
      PrecedenceTier: RulePrecedenceTier.Optimization,
      ControlMode: RuleControlMode.AutoSuggestion,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });

    expect(detector.Detect([high, low])).toEqual([]);
  });

  it('does NOT report a conflict for same-tier rules on different scopes', () => {
    const owner1 = BuildRule({
      RuleCode: 'OWN-1',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
    });
    const owner2 = BuildRule({
      RuleCode: 'OWN-2',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-2',
    });

    expect(detector.Detect([owner1, owner2])).toEqual([]);
  });

  it('keeps the compliance hard block as the deterministic winner of a conflict group', () => {
    // Same Compliance tier + same scope, but one is a hard block and one is a soft warning.
    // Resolver sort guarantees the hard block is first; the detector must echo it as group winner.
    const hardBlock = BuildRule({
      RuleCode: 'COM-BLOCK',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
    });
    const softWarning = BuildRule({
      RuleCode: 'COM-WARN',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });

    const conflicts = detector.Detect([hardBlock, softWarning]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].WinnerRuleCode).toBe('COM-BLOCK');
  });

  it('returns no conflicts for an empty or single-candidate list', () => {
    expect(detector.Detect([])).toEqual([]);
    expect(detector.Detect([BuildRule({ WarehouseTypeCode: 'TIER_1' })])).toEqual([]);
  });

  it('reports a conflict for same-tier same-scope rules with the SAME control mode but DIVERGENT action (AC3 action divergence)', () => {
    // Both APPROVAL_REQUIRED but the actions differ (REQUIRE_APPROVAL vs SET_FLAG). The resolver still
    // silently picks one by priority/recency, so the admin must see this pre-activation ambiguity.
    const requireApproval = BuildRule({
      RuleCode: 'OWN-REQ',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      ActionJson: { Type: 'REQUIRE_APPROVAL' },
    });
    const setFlag = BuildRule({
      RuleCode: 'OWN-FLAG',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      ActionJson: { Type: 'SET_FLAG', Params: { Flag: 'QUARANTINE' } },
    });

    const conflicts = detector.Detect([requireApproval, setFlag]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].Rules.map((rule) => rule.RuleCode).sort()).toEqual(['OWN-FLAG', 'OWN-REQ']);
    expect(conflicts[0].WinnerRuleCode).toBe('OWN-REQ');
  });

  it('does NOT report a conflict when same-tier same-scope rules share BOTH control mode AND action', () => {
    const ruleA = BuildRule({
      RuleCode: 'OWN-A',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      ActionJson: { Type: 'REQUIRE_APPROVAL', Params: { Level: 'L1' } },
    });
    const ruleB = BuildRule({
      RuleCode: 'OWN-B',
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      ControlMode: RuleControlMode.ApprovalRequired,
      WarehouseTypeCode: 'TIER_1',
      OwnerId: 'owner-1',
      ActionJson: { Type: 'REQUIRE_APPROVAL', Params: { Level: 'L1' } },
    });

    expect(detector.Detect([ruleA, ruleB])).toEqual([]);
  });

  it('detects a >=3 rule conflict group with divergent control modes', () => {
    const a = BuildRule({
      RuleCode: 'OP-A',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: 'TIER_1',
      ZoneId: 'zone-1',
    });
    const b = BuildRule({
      RuleCode: 'OP-B',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
      ZoneId: 'zone-1',
    });
    const c = BuildRule({
      RuleCode: 'OP-C',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.AutoSuggestion,
      WarehouseTypeCode: 'TIER_1',
      ZoneId: 'zone-1',
    });

    const conflicts = detector.Detect([a, b, c]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].Rules).toHaveLength(3);
    expect(conflicts[0].WinnerRuleCode).toBe('OP-A');
  });
});
