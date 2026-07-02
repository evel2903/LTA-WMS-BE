import { randomUUID } from 'crypto';
import { IRuleGroupRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleAction, RuleCondition } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';

export const InboundBaselineWarehouseTypeCode = 'WT-01';
export const InboundBaselineProfileCode = 'WP-LTA-HCM-DEMO';

export type InboundRuleBaselineEntry = {
  RuleCode: string;
  RuleName: string;
  RuleGroupCode: string;
  PrecedenceTier: RulePrecedenceTier;
  ControlMode: RuleControlMode;
  ConditionJson: RuleCondition;
  ActionJson: RuleAction;
};

/**
 * Epic 24 (IN-RULE-24) baseline rule set: one representative rule per inbound/putaway decision
 * point (§5 of the architecture addendum), scoped to WarehouseTypeCode=WT-01 only. This is a
 * baseline, not the full authored rule catalog for WT-01 — IRE-02..05 may add more rules per
 * decision point as they migrate each use case off hardcoded policy reads.
 */
export const InboundRuleBaselineEntries: ReadonlyArray<InboundRuleBaselineEntry> = [
  {
    RuleCode: 'RULE-IN-GATE-01',
    RuleName: 'Gate-in requires appointment',
    RuleGroupCode: 'R-INBOUND',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.ApprovalRequired,
    ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'hasAppointment', Comparator: 'EQ', Value: false }] },
    ActionJson: { Type: 'REQUIRE_APPROVAL', Params: { Message: 'Gate-in thiếu appointment, cần duyệt' } },
  },
  {
    RuleCode: 'RULE-IN-TOL-01',
    RuleName: 'Receiving over/under tolerance requires approval',
    RuleGroupCode: 'R-INBOUND',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.ApprovalRequired,
    ConditionJson: { Operator: 'ANY', Predicates: [{ Field: 'overUnderPct', Comparator: 'GT', Value: 5 }] },
    ActionJson: { Type: 'REQUIRE_APPROVAL', Params: { Message: 'Vượt tolerance nhận hàng, cần duyệt' } },
  },
  {
    RuleCode: 'RULE-QC-TRIG-01',
    RuleName: 'High supplier risk requires QC approval',
    RuleGroupCode: 'R-INBOUND',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.ApprovalRequired,
    ConditionJson: { Operator: 'ANY', Predicates: [{ Field: 'supplierRisk', Comparator: 'EQ', Value: 'high' }] },
    ActionJson: {
      Type: 'REQUIRE_APPROVAL',
      Params: { Message: 'Supplier rủi ro cao, yêu cầu QC trước khi Available' },
    },
  },
  {
    RuleCode: 'RULE-LPN-REQ-01',
    RuleName: 'LPN required when profile controls LPN',
    RuleGroupCode: 'R-INBOUND',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.HardBlock,
    ConditionJson: {
      Operator: 'ALL',
      Predicates: [
        { Field: 'lpnControlled', Comparator: 'EQ', Value: true },
        { Field: 'hasLpn', Comparator: 'EQ', Value: false },
      ],
    },
    ActionJson: { Type: 'BLOCK', Params: { Message: 'Thiếu LPN khi profile yêu cầu lpnControlled' } },
  },
  {
    RuleCode: 'RULE-PUT-ELIG-01',
    RuleName: 'Suggest putaway location with available capacity',
    RuleGroupCode: 'R-PUT',
    PrecedenceTier: RulePrecedenceTier.Optimization,
    ControlMode: RuleControlMode.AutoSuggestion,
    ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'capacityAvailable', Comparator: 'EQ', Value: true }] },
    ActionJson: { Type: 'SUGGEST', Params: { Message: 'Gợi ý vị trí còn capacity trong zone phù hợp' } },
  },
  {
    RuleCode: 'RULE-COM-COLD-01',
    RuleName: 'Temperature excursion hard block',
    RuleGroupCode: 'R-COM',
    PrecedenceTier: RulePrecedenceTier.Compliance,
    ControlMode: RuleControlMode.HardBlock,
    ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'tempOutOfRange', Comparator: 'EQ', Value: true }] },
    ActionJson: { Type: 'BLOCK', Params: { Message: 'Nhiệt độ ngoài khoảng cho phép — compliance hard block' } },
  },
];

/**
 * Idempotent seed: for each baseline entry, resolve its rule group (must already be ACTIVE —
 * run SeedRuleGroupCatalog first), create the RuleDefinitionEntity if a rule with the same
 * RuleCode does not already exist, and bind it to the WT-01 demo profile if not already bound.
 * Skips (does not throw) when the target profile or rule group is missing, so this seed can run
 * safely even before demo data exists — callers should check the returned counts.
 */
export async function SeedInboundRuleBaseline(
  groupRepository: IRuleGroupRepository,
  definitionRepository: IRuleDefinitionRepository,
  bindingRepository: IWarehouseProfileRuleRepository,
  profileRepository: IWarehouseProfileRepository,
): Promise<{
  RuleGroupMissing: string[];
  ProfileMissing: boolean;
  DefinitionsCreated: number;
  BindingsCreated: number;
}> {
  const result = { RuleGroupMissing: [] as string[], ProfileMissing: false, DefinitionsCreated: 0, BindingsCreated: 0 };

  const profile = await profileRepository.FindByCode(InboundBaselineProfileCode);
  if (!profile) {
    result.ProfileMissing = true;
    return result;
  }

  const scopeKeyService = new ScopeKeyService();
  const scopeKey = scopeKeyService.Build({ WarehouseTypeCode: InboundBaselineWarehouseTypeCode });

  for (const entry of InboundRuleBaselineEntries) {
    const group = await groupRepository.FindByCode(entry.RuleGroupCode);
    if (!group) {
      result.RuleGroupMissing.push(entry.RuleGroupCode);
      continue;
    }

    let definition = await definitionRepository.FindByCode(entry.RuleCode);
    if (!definition) {
      const now = new Date();
      definition = await definitionRepository.Create(
        new RuleDefinitionEntity({
          Id: randomUUID(),
          RuleCode: entry.RuleCode,
          RuleName: entry.RuleName,
          RuleGroupId: group.Id,
          PrecedenceTier: entry.PrecedenceTier,
          ControlMode: entry.ControlMode,
          WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
          ScopeKey: scopeKey,
          ConditionJson: entry.ConditionJson,
          ActionJson: entry.ActionJson,
          Status: RuleStatus.Active,
          EffectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
          SourceSystem: 'SEED',
          ReferenceId: null,
          CreatedAt: now,
          UpdatedAt: now,
          CreatedBy: null,
          UpdatedBy: null,
        }),
      );
      result.DefinitionsCreated += 1;
    }

    const existingBinding = await bindingRepository.FindByProfileAndRule(profile.Id, definition.Id);
    if (!existingBinding) {
      const now = new Date();
      await bindingRepository.Create(
        new WarehouseProfileRuleEntity({
          Id: randomUUID(),
          WarehouseProfileId: profile.Id,
          RuleDefinitionId: definition.Id,
          IsEnabled: true,
          SourceSystem: 'SEED',
          ReferenceId: null,
          CreatedAt: now,
          UpdatedAt: now,
          CreatedBy: null,
          UpdatedBy: null,
        }),
      );
      result.BindingsCreated += 1;
    }
  }

  return result;
}
