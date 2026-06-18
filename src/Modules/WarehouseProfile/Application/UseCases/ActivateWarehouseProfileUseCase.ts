import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActivateWarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/ActivateWarehouseProfileDto';
import { WarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileDto';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileDtoMapper';
import { ParseEffectiveDate } from '@modules/WarehouseProfile/Application/Services/EffectiveDate';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

/**
 * B5 activation use case (pure class; wired via useFactory). The single place a profile moves
 * DRAFT -> ACTIVE. Gate order (all in the same logical activation step):
 *   1. transition guard (only DRAFT activatable; ACTIVE/EXPIRED/RETIRED -> BusinessRuleException),
 *   2. optional effective-window override + scope readiness + window validity (reuse B1 validator),
 *   3. preview self-check gate (conflicts / non-Compliance hard block) — read-only (ProfileActivationGuard),
 *   4. set ACTIVE + store activation actor/reason context (audit_policy.LastActivation) + audit meta,
 *   5. inside ONE transaction (architecture 5.2): re-check overlap-by-window against other ACTIVE
 *      profiles of the same ScopeKey, then persist — atomic read-then-write closing the race.
 */
export class ActivateWarehouseProfileUseCase {
  constructor(
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly policyValidator: WarehouseProfilePolicyValidator,
    private readonly activationGuard: ProfileActivationGuard,
  ) {}

  public async Execute(request: ActivateWarehouseProfileDto): Promise<WarehouseProfileDto> {
    const profile = await this.profileRepository.FindById(request.Id);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    this.AssertActivatableTransition(profile);

    // Optional effective-window override at activation; otherwise keep the existing window.
    if (request.EffectiveFrom !== undefined) {
      profile.EffectiveFrom = ParseEffectiveDate(request.EffectiveFrom, 'EffectiveFrom');
    }
    if (request.EffectiveTo !== undefined) {
      profile.EffectiveTo =
        request.EffectiveTo === null ? null : ParseEffectiveDate(request.EffectiveTo, 'EffectiveTo');
    }
    this.policyValidator.AssertScopeReadiness({ WarehouseTypeCode: profile.WarehouseTypeCode });
    this.policyValidator.AssertEffectiveWindow(profile.EffectiveFrom, profile.EffectiveTo);

    // Read-only preview self-check gate (no write) — safe to run before the transaction.
    await this.activationGuard.AssertActivatable(profile);

    // architecture 5.2: the overlap check and the status write MUST be atomic so two concurrent
    // activations at the same ScopeKey cannot both pass the overlap read before either writes. The
    // overlap re-check runs FIRST inside the transaction; the entity is only mutated to ACTIVE once
    // the check passes, so a blocked activation leaves the profile untouched (still DRAFT).
    const updated = await this.profileRepository.RunInTransaction(async (txRepository) => {
      await this.activationGuard.AssertNoOverlap(profile, txRepository);

      const now = new Date();
      profile.Status = WarehouseProfileStatus.Active;
      this.RecordActivationContext(profile, request, now);
      if (request.ActorUserId != null) {
        profile.UpdatedBy = request.ActorUserId;
      }
      profile.UpdatedAt = now;

      return txRepository.Update(profile);
    });
    return WarehouseProfileDtoMapper.ToDto(updated);
  }

  private AssertActivatableTransition(profile: WarehouseProfileEntity): void {
    if (profile.Status === WarehouseProfileStatus.Active) {
      throw new BusinessRuleException('Profile is already active');
    }
    if (profile.Status !== WarehouseProfileStatus.Draft) {
      throw new BusinessRuleException(`Cannot activate a profile in status ${profile.Status}`);
    }
  }

  private RecordActivationContext(
    profile: WarehouseProfileEntity,
    request: ActivateWarehouseProfileDto,
    now: Date,
  ): void {
    // Store the input actor/reason context for C5 to read; this is NOT an immutable audit trail.
    profile.AuditPolicy = {
      ...profile.AuditPolicy,
      LastActivation: {
        ActorUserId: request.ActorUserId ?? null,
        ReasonCode: request.ReasonCode ?? null,
        ReasonNote: request.ReasonNote ?? null,
        ActivatedAt: now.toISOString(),
      },
    };
  }
}
