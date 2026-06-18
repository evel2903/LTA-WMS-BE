import {
  WarehouseProfileChecklistDto,
  WarehouseProfileChecklistItemDto,
} from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileChecklistDto';
import { RulePreviewResult } from '@modules/WarehouseProfile/Application/DTOs/PreviewRuleResolutionDto';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IRuleGroupRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { ProfileChecklistItemCode } from '@modules/WarehouseProfile/Domain/Constants/ProfileChecklistItemCode';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Enums/ProfileChecklistItemStatus';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

const PAGE_SIZE = 100;

/** A bound rule paired with the catalog state of its rule group (read once, reused per item). */
type BoundRule = {
  Rule: RuleDefinitionEntity;
  GroupState: RuleGroupCatalogState | null;
};

/**
 * B7 read-only verification layer (architecture 5.x) over the B1-B5 surfaces. It READS the profile /
 * rule / group / binding ports and RE-USES the B4 preview (which wraps the B3 resolver + conflict
 * detector) to score each checklist item as Pass/Fail/Warning/Deferred. It NEVER mutates, never
 * re-implements precedence/conflict/control-mode, and never throws for a Fail/Warning — those are
 * data on the returned DTO (the use case throws NotFoundException only when the profile is absent).
 *
 * Pure class (no @Injectable); wired via useFactory in WarehouseProfileModule.
 */
export class WarehouseProfileChecklistService {
  constructor(
    private readonly profiles: IWarehouseProfileRepository,
    private readonly groups: IRuleGroupRepository,
    private readonly definitions: IRuleDefinitionRepository,
    private readonly bindings: IWarehouseProfileRuleRepository,
    private readonly preview: PreviewRuleResolutionUseCase,
  ) {}

  public async Verify(profile: WarehouseProfileEntity, evaluatedAt: Date): Promise<WarehouseProfileChecklistDto> {
    const boundRules = await this.LoadBoundRules(profile);
    const previewResult = await this.RunPreview(profile, evaluatedAt);
    const activeByScope = await this.profiles.ListActiveByScope(evaluatedAt);

    const items: WarehouseProfileChecklistItemDto[] = [
      this.EvaluateActiveProfile(profile, activeByScope),
      this.EvaluateRuleGroup(boundRules),
      this.EvaluateControlMode(previewResult),
      this.EvaluatePrecedenceConflict(previewResult),
      this.EvaluateDefaultProfile(profile, activeByScope),
      this.Deferred(
        ProfileChecklistItemCode.DefaultSystemSeed,
        'System default profile seed',
        'A global system-default fallback profile (architecture 5.5) is not seeded in V0.',
        'V1+',
      ),
      this.EvaluateOverrideReady(previewResult, boundRules),
      this.Deferred(
        ProfileChecklistItemCode.OverrideExecution,
        'Override execution',
        'Applying/executing an override is out of V0 scope.',
        'C6/C7',
      ),
      this.EvaluateAuditReady(profile, boundRules),
      this.Deferred(
        ProfileChecklistItemCode.AuditImmutable,
        'Immutable audit trail',
        'Immutable before/after audit-trail enforcement is out of V0 scope.',
        'C4/C5',
      ),
      this.Deferred(
        ProfileChecklistItemCode.AuditReasonCatalog,
        'Reason code catalog',
        'reason_code catalog validation is out of V0 scope.',
        'C3',
      ),
      this.EvaluateEffectiveVersion(profile, evaluatedAt),
      this.EvaluateOwnerSegregation(profile, boundRules),
      this.Deferred(
        ProfileChecklistItemCode.RbacReady,
        'RBAC / data-scope enforcement',
        'Granular RBAC and multi-owner data-scope enforcement are out of V0 scope.',
        'C1/C2',
      ),
      this.EvaluateCompliance(previewResult),
    ];

    const overallStatus = items.some((item) => item.Status === ProfileChecklistItemStatus.Fail)
      ? ProfileChecklistItemStatus.Fail
      : ProfileChecklistItemStatus.Pass;

    return {
      ProfileId: profile.Id,
      WarehouseTypeCode: profile.WarehouseTypeCode,
      OverallStatus: overallStatus,
      Items: items,
      EvaluatedAt: evaluatedAt,
    };
  }

  /** WP-ACTIVE: exactly one active profile for the scope at EvaluatedAt. */
  private EvaluateActiveProfile(
    profile: WarehouseProfileEntity,
    activeByScope: WarehouseProfileEntity[],
  ): WarehouseProfileChecklistItemDto {
    const title = 'Active profile';
    if (profile.Status !== WarehouseProfileStatus.Active) {
      return this.Fail(
        ProfileChecklistItemCode.ActiveProfile,
        title,
        `Profile is ${profile.Status}; it must be ACTIVE for the scope to operate.`,
        [profile.Status],
      );
    }
    const sameScopeActive = activeByScope.filter((candidate) => candidate.ScopeKey === profile.ScopeKey);
    if (sameScopeActive.length > 1) {
      return this.Fail(
        ProfileChecklistItemCode.ActiveProfile,
        title,
        'More than one active profile shares this scope (B5 one-active-per-scope invariant violated).',
        sameScopeActive.map((candidate) => candidate.Id),
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.ActiveProfile,
      title,
      'Exactly one active profile exists for this scope.',
      [profile.Id],
    );
  }

  /** WP-RULE-GROUP: bound rules sit in ACTIVE catalog groups; PLACEHOLDER -> Deferred V1+. */
  private EvaluateRuleGroup(boundRules: BoundRule[]): WarehouseProfileChecklistItemDto {
    const title = 'Related rule groups';
    if (boundRules.length === 0) {
      return this.Warning(
        ProfileChecklistItemCode.RuleGroup,
        title,
        'The active profile has no rule bound; nothing to verify for rule groups.',
        [],
      );
    }
    const placeholderBound = boundRules.filter((bound) => bound.GroupState === RuleGroupCatalogState.Placeholder);
    const activeBound = boundRules.filter((bound) => bound.GroupState === RuleGroupCatalogState.Active);
    if (activeBound.length === 0 && placeholderBound.length > 0) {
      return this.Deferred(
        ProfileChecklistItemCode.RuleGroup,
        title,
        'All bound rules belong to PLACEHOLDER catalog groups (V1+ business groups, not evaluated in V0).',
        'V1+',
        placeholderBound.map((bound) => bound.Rule.RuleCode),
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.RuleGroup,
      title,
      'Bound rules belong to ACTIVE catalog groups.',
      activeBound.map((bound) => bound.Rule.RuleCode),
    );
  }

  /** WP-CONTROL-MODE: resolved winner control mode is one of the four valid modes. */
  private EvaluateControlMode(previewResult: RulePreviewResult): WarehouseProfileChecklistItemDto {
    const title = 'Control modes';
    const mode = previewResult.ControlMode.Mode;
    if (mode === null) {
      return this.Warning(
        ProfileChecklistItemCode.ControlMode,
        title,
        'No rule resolved, so there is no control mode to confirm for this profile.',
        [],
      );
    }
    if (!this.IsValidControlMode(mode)) {
      return this.Fail(
        ProfileChecklistItemCode.ControlMode,
        title,
        `Resolved control mode "${String(mode)}" is not one of the four valid V0 control modes.`,
        [String(mode)],
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.ControlMode,
      title,
      `Resolved control mode "${mode}" is a valid V0 control mode.`,
      [mode],
    );
  }

  /** WP-PRECEDENCE-CONFLICT: read RulePreviewResult.Conflicts (never re-sort). */
  private EvaluatePrecedenceConflict(previewResult: RulePreviewResult): WarehouseProfileChecklistItemDto {
    const title = 'Precedence conflict';
    if (previewResult.Conflicts.length === 0) {
      return this.Pass(
        ProfileChecklistItemCode.PrecedenceConflict,
        title,
        'No same-tier same-scope rule conflict was detected.',
        [],
      );
    }
    return this.Fail(
      ProfileChecklistItemCode.PrecedenceConflict,
      title,
      'Unresolved same-tier same-scope rule conflict(s) detected; an admin must resolve them.',
      previewResult.Conflicts.map(
        (conflict) =>
          `${conflict.PrecedenceTier}:${conflict.ScopeKey}:${conflict.Rules.map((rule) => rule.RuleCode).join('|')}`,
      ),
    );
  }

  /** WP-DEFAULT: an active fallback profile exists for the warehouse type. */
  private EvaluateDefaultProfile(
    profile: WarehouseProfileEntity,
    activeByScope: WarehouseProfileEntity[],
  ): WarehouseProfileChecklistItemDto {
    const title = 'Default profile (type fallback)';
    const activeForType = activeByScope.filter(
      (candidate) => candidate.WarehouseTypeCode === profile.WarehouseTypeCode,
    );
    if (activeForType.length === 0) {
      return this.Fail(
        ProfileChecklistItemCode.DefaultProfile,
        title,
        `No active fallback profile exists for warehouse type ${profile.WarehouseTypeCode}.`,
        [profile.WarehouseTypeCode],
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.DefaultProfile,
      title,
      `An active fallback profile exists for warehouse type ${profile.WarehouseTypeCode}.`,
      activeForType.map((candidate) => candidate.Id),
    );
  }

  /** WP-OVERRIDE-READY: override-readiness flags are readable from the winner / bound rules. */
  private EvaluateOverrideReady(
    previewResult: RulePreviewResult,
    boundRules: BoundRule[],
  ): WarehouseProfileChecklistItemDto {
    const title = 'Override readiness';
    const readiness = previewResult.ReasonReadiness;
    if (readiness === null) {
      if (boundRules.length === 0) {
        return this.Warning(
          ProfileChecklistItemCode.OverrideReady,
          title,
          'No winning rule, so override-readiness flags are not yet determinable.',
          [],
        );
      }
      return this.Warning(
        ProfileChecklistItemCode.OverrideReady,
        title,
        'No rule resolved at the self-context, so override-readiness flags could not be confirmed.',
        [],
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.OverrideReady,
      title,
      'Override-readiness flags (AllowOverride/RequiresReason/RequiresEvidence) are readable from the winner.',
      [
        `AllowOverride=${readiness.AllowOverride}`,
        `RequiresReason=${readiness.RequiresReason}`,
        `RequiresEvidence=${readiness.RequiresEvidence}`,
      ],
    );
  }

  /** WP-AUDIT-READY: audit flags on bound rules + LastActivation metadata when activated. */
  private EvaluateAuditReady(
    profile: WarehouseProfileEntity,
    boundRules: BoundRule[],
  ): WarehouseProfileChecklistItemDto {
    const title = 'Audit readiness';
    const evidence: string[] = [];
    const lastActivation = profile.AuditPolicy.LastActivation;
    const hasActivationMetadata =
      profile.Status === WarehouseProfileStatus.Active &&
      lastActivation !== undefined &&
      lastActivation !== null &&
      typeof lastActivation === 'object';
    if (hasActivationMetadata) {
      evidence.push('AuditPolicy.LastActivation');
    }
    const auditRules = boundRules.filter((bound) => bound.Rule.RequiresReason || bound.Rule.RequiresEvidence);
    evidence.push(...auditRules.map((bound) => `${bound.Rule.RuleCode}:audit-flagged`));

    if (profile.Status === WarehouseProfileStatus.Active && !hasActivationMetadata) {
      return this.Warning(
        ProfileChecklistItemCode.AuditReady,
        title,
        'Active profile has no LastActivation audit metadata recorded.',
        evidence,
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.AuditReady,
      title,
      'Audit-readiness flags and activation metadata are readable.',
      evidence,
    );
  }

  /** WP-EFFECTIVE-VERSION: effective window contains EvaluatedAt and Version >= 1. */
  private EvaluateEffectiveVersion(
    profile: WarehouseProfileEntity,
    evaluatedAt: Date,
  ): WarehouseProfileChecklistItemDto {
    const title = 'Effective date / version';
    const startsInPast = profile.EffectiveFrom.getTime() <= evaluatedAt.getTime();
    const notExpired = profile.EffectiveTo === null || profile.EffectiveTo.getTime() > evaluatedAt.getTime();
    const versionValid = profile.Version >= 1;
    if (!startsInPast || !notExpired || !versionValid) {
      return this.Fail(
        ProfileChecklistItemCode.EffectiveVersion,
        title,
        'Effective window does not contain EvaluatedAt or Version is below 1.',
        [
          `EffectiveFrom=${profile.EffectiveFrom.toISOString()}`,
          `EffectiveTo=${profile.EffectiveTo === null ? 'null' : profile.EffectiveTo.toISOString()}`,
          `Version=${profile.Version}`,
        ],
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.EffectiveVersion,
      title,
      'Effective window contains EvaluatedAt and Version is valid.',
      [`Version=${profile.Version}`],
    );
  }

  /** WP-OWNER-SEGREGATION: owner/customer scope is consistent across profile + owner-scoped rules. */
  private EvaluateOwnerSegregation(
    profile: WarehouseProfileEntity,
    boundRules: BoundRule[],
  ): WarehouseProfileChecklistItemDto {
    const title = 'Owner segregation';
    if (profile.OwnerId === null) {
      return this.Pass(
        ProfileChecklistItemCode.OwnerSegregation,
        title,
        'Profile is owner-agnostic (wildcard owner scope); no segregation to verify in V0.',
        [],
      );
    }
    // Any owner-scoped bound rule must target the same owner as the profile, otherwise data from a
    // different owner would mix into this profile's scope.
    const mismatched = boundRules.filter(
      (bound) => bound.Rule.OwnerId !== null && bound.Rule.OwnerId !== profile.OwnerId,
    );
    if (mismatched.length > 0) {
      return this.Warning(
        ProfileChecklistItemCode.OwnerSegregation,
        title,
        'A bound rule is scoped to a different owner than the profile; verify owner segregation.',
        mismatched.map((bound) => `${bound.Rule.RuleCode}:owner=${bound.Rule.OwnerId}`),
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.OwnerSegregation,
      title,
      'Profile and owner-scoped rules share a consistent owner scope.',
      [`owner=${profile.OwnerId}`],
    );
  }

  /**
   * WP-COMPLIANCE: a Compliance hard block is a legitimate winner (handoff rule 11). A
   * non-Compliance hard block winning at the self-context is a misconfiguration (B5 definition).
   */
  private EvaluateCompliance(previewResult: RulePreviewResult): WarehouseProfileChecklistItemDto {
    const title = 'Compliance rule';
    const winner = previewResult.Winner;
    if (winner === null) {
      return this.Pass(
        ProfileChecklistItemCode.Compliance,
        title,
        'No winning rule; no compliance misconfiguration present.',
        [],
      );
    }
    if (winner.ControlMode === RuleControlMode.HardBlock && winner.PrecedenceTier !== RulePrecedenceTier.Compliance) {
      return this.Fail(
        ProfileChecklistItemCode.Compliance,
        title,
        `A non-Compliance hard block (${winner.RuleCode}, tier ${winner.PrecedenceTier}) wins at the self-context; this is a misconfiguration.`,
        [winner.RuleCode, winner.PrecedenceTier],
      );
    }
    if (winner.ControlMode === RuleControlMode.HardBlock && winner.PrecedenceTier === RulePrecedenceTier.Compliance) {
      return this.Pass(
        ProfileChecklistItemCode.Compliance,
        title,
        `Compliance hard block (${winner.RuleCode}) is a legitimate winner (handoff rule 11).`,
        [winner.RuleCode],
      );
    }
    return this.Pass(
      ProfileChecklistItemCode.Compliance,
      title,
      'Winner is not a hard block; no compliance misconfiguration.',
      [winner.RuleCode],
    );
  }

  /** Reads all enabled bindings of the profile and resolves each rule + its group catalog state. */
  private async LoadBoundRules(profile: WarehouseProfileEntity): Promise<BoundRule[]> {
    const ruleIds: string[] = [];
    let skip = 0;
    for (;;) {
      const page = await this.bindings.ListByProfile(profile.Id, skip, PAGE_SIZE);
      ruleIds.push(...page.Items.filter((binding) => binding.IsEnabled).map((binding) => binding.RuleDefinitionId));
      skip += PAGE_SIZE;
      if (skip >= page.TotalItems || page.Items.length === 0) {
        break;
      }
    }

    const groupStateCache = new Map<string, RuleGroupCatalogState | null>();
    const boundRules: BoundRule[] = [];
    for (const ruleId of ruleIds) {
      const rule = await this.definitions.FindById(ruleId);
      if (!rule) {
        continue;
      }
      boundRules.push({ Rule: rule, GroupState: await this.GroupState(rule.RuleGroupId, groupStateCache) });
    }
    return boundRules;
  }

  private async GroupState(
    ruleGroupId: string,
    cache: Map<string, RuleGroupCatalogState | null>,
  ): Promise<RuleGroupCatalogState | null> {
    const cached = cache.get(ruleGroupId);
    if (cached !== undefined) {
      return cached;
    }
    const group = await this.groups.FindById(ruleGroupId);
    const state = group ? group.CatalogState : null;
    cache.set(ruleGroupId, state);
    return state;
  }

  /**
   * Runs the B4 preview at the profile's own scope (targeting THIS profile by id so a still-DRAFT
   * candidate is evaluated). Read-only: B7 interprets the result; it never throws on it.
   */
  private RunPreview(profile: WarehouseProfileEntity, evaluatedAt: Date): Promise<RulePreviewResult> {
    return this.preview.Execute({
      ProfileId: profile.Id,
      WarehouseTypeCode: profile.WarehouseTypeCode,
      WarehouseId: profile.WarehouseId,
      ZoneId: profile.ZoneId,
      LocationType: profile.LocationType,
      OwnerId: profile.OwnerId,
      SkuId: profile.SkuId,
      ItemClass: profile.ItemClass,
      OrderType: profile.OrderType,
      CustomerId: profile.CustomerId,
      SupplierId: profile.SupplierId,
      Action: 'OPERATION',
      EvaluatedAt: evaluatedAt,
    });
  }

  private IsValidControlMode(mode: RuleControlMode): boolean {
    return Object.values(RuleControlMode).includes(mode);
  }

  private Pass(code: string, title: string, message: string, evidence: string[]): WarehouseProfileChecklistItemDto {
    return { Code: code, Title: title, Status: ProfileChecklistItemStatus.Pass, Message: message, Evidence: evidence };
  }

  private Fail(code: string, title: string, message: string, evidence: string[]): WarehouseProfileChecklistItemDto {
    return { Code: code, Title: title, Status: ProfileChecklistItemStatus.Fail, Message: message, Evidence: evidence };
  }

  private Warning(code: string, title: string, message: string, evidence: string[]): WarehouseProfileChecklistItemDto {
    return {
      Code: code,
      Title: title,
      Status: ProfileChecklistItemStatus.Warning,
      Message: message,
      Evidence: evidence,
    };
  }

  private Deferred(
    code: string,
    title: string,
    message: string,
    deferredToStory: string,
    evidence: string[] = [],
  ): WarehouseProfileChecklistItemDto {
    return {
      Code: code,
      Title: title,
      Status: ProfileChecklistItemStatus.Deferred,
      Message: message,
      Evidence: evidence,
      DeferredToStory: deferredToStory,
    };
  }
}
