import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';

/**
 * Read-only Application service that owns the two activation gates of B5 (architecture 5.2 / 5.5):
 *
 *  1. AssertNoOverlap — one active profile per scope at any effective instant. "Same scope" = same
 *     ScopeKey (the B3 six-axis hash already on the entity), and "overlap" = half-open effective
 *     windows intersect (EffectiveTo = null means +infinity). Enforced in the Application layer over
 *     the repository port (architecture chose this over a PostgreSQL exclusion constraint for V0).
 *
 *  2. AssertActivatable — reuses the B4 preview (PreviewRuleResolutionUseCase, which wraps the B3
 *     resolver + RuleConflictDetector) for a self-check context built from the profile's own scope.
 *     B5 only READS the RulePreviewResult; it never re-implements conflict detection or precedence.
 *       - Any measured same-scope same-category conflict (Conflicts non-empty) => ConflictException
 *         (the config is ambiguous; an admin must resolve it before activation), with the conflicts
 *         surfaced as Details.
 *       - A winning HARD_BLOCK that is NOT in the Compliance tier => BusinessRuleException: a
 *         non-Compliance hard block at the self-context winner means the profile would block every
 *         operation in its own scope, i.e. a misconfiguration. A Compliance hard block is legitimate
 *         (handoff rule 11: Compliance hard block always wins and is never treated as an override or
 *         misconfig), so it does NOT block activation.
 */
export class ProfileActivationGuard {
  constructor(
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly previewUseCase: PreviewRuleResolutionUseCase,
  ) {}

  /**
   * Overlap-by-window check against other ACTIVE profiles of the same ScopeKey. Accepts an optional
   * repository so the activation use case can run the check inside its transaction (against the
   * transaction-scoped repo) and have the read-then-write be atomic (architecture 5.2); when omitted
   * the guard's own injected repository is used (e.g. read-only callers such as B7).
   */
  public async AssertNoOverlap(
    profile: WarehouseProfileEntity,
    repository: IWarehouseProfileRepository = this.profileRepository,
  ): Promise<void> {
    const overlapping = await repository.FindActiveOverlapping(
      profile.ScopeKey,
      profile.EffectiveFrom,
      profile.EffectiveTo,
      profile.Id,
    );
    if (overlapping.length > 0) {
      throw new ConflictException('An active profile already exists for this scope and effective window', {
        ConflictingProfileIds: overlapping.map((other) => other.Id),
      });
    }
  }

  public async AssertActivatable(profile: WarehouseProfileEntity): Promise<void> {
    // Self-check: evaluate the profile's OWN rules at its effective-from instant. ProfileId targets
    // the candidate directly so the resolver evaluates this profile's bound rules even though it is
    // still DRAFT (and therefore invisible to the ACTIVE-only ListActiveByScope scope path). Action
    // OPERATION models "can this scope operate at all"; a non-Compliance hard winner means a
    // self-blocking misconfiguration, and any measured conflict means an ambiguous config.
    const preview = await this.previewUseCase.Execute({
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
      EvaluatedAt: profile.EffectiveFrom,
    });

    if (preview.Conflicts.length > 0) {
      throw new ConflictException('Profile preview still has unresolved rule conflicts', {
        Conflicts: preview.Conflicts,
      });
    }

    const winner = preview.Winner;
    if (
      winner !== null &&
      winner.ControlMode === RuleControlMode.HardBlock &&
      winner.PrecedenceTier !== RulePrecedenceTier.Compliance
    ) {
      throw new BusinessRuleException(
        `Profile preview resolves to a non-Compliance hard block (${winner.RuleCode}); fix the misconfiguration before activation`,
      );
    }
  }
}
