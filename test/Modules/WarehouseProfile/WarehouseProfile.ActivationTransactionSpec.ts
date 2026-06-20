import { EntityManager } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { InMemoryWarehouseProfileRepository } from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';
import { StubRuleResolver } from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * Architecture 5.2: "Application use case phải check overlap TRONG transaction." Two concurrent
 * activations of different DRAFT profiles at the same ScopeKey must not both pass the overlap read
 * before either writes. These specs prove the overlap re-check + status write run inside a single
 * transactional boundary exposed by the repository port (RunInTransaction), not as two unguarded
 * repo calls.
 */

const scopeKeyService = new ScopeKeyService();
const D = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function BuildDraft(
  repo: IWarehouseProfileRepository,
  id: string,
  effectiveFrom: Date,
): Promise<WarehouseProfileEntity> {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return repo.Create(
    new WarehouseProfileEntity({
      Id: id,
      ProfileCode: `WP-${id}`,
      ProfileName: `Profile ${id}`,
      WarehouseTypeCode: 'TIER_1',
      Version: 1,
      Status: WarehouseProfileStatus.Draft,
      WarehouseId: null,
      ScopeKey: scopeKeyService.Build({ WarehouseTypeCode: 'TIER_1' }),
      EffectiveFrom: effectiveFrom,
      EffectiveTo: null,
      CreatedAt: now,
      UpdatedAt: now,
    }),
  );
}

function CleanPreview(): PreviewRuleResolutionUseCase {
  const winner = BuildRule({
    RuleCode: 'OP-CLEAN',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.SoftWarning,
    WarehouseTypeCode: 'TIER_1',
  });
  return new PreviewRuleResolutionUseCase(
    new StubRuleResolver({
      Winner: winner,
      Allowed: true,
      ApprovalRequired: false,
      OrderedCandidates: [winner],
      EffectivePriorities: { [winner.Id]: winner.Priority },
      ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
    }),
    new RuleConflictDetector(),
  );
}

/** Records every RunInTransaction call so we can assert the activation went through the boundary. */
class TransactionTrackingRepository extends InMemoryWarehouseProfileRepository {
  public TransactionCount = 0;
  public OverlapCheckedInsideTransaction = false;
  private insideTransaction = false;

  public async RunInTransaction<T>(
    work: (txRepo: IWarehouseProfileRepository, manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    this.TransactionCount += 1;
    this.insideTransaction = true;
    try {
      return await work(this, undefined as unknown as EntityManager);
    } finally {
      this.insideTransaction = false;
    }
  }

  public async FindActiveOverlapping(
    scopeKey: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeProfileId: string,
  ): Promise<WarehouseProfileEntity[]> {
    if (this.insideTransaction) {
      this.OverlapCheckedInsideTransaction = true;
    }
    return super.FindActiveOverlapping(scopeKey, effectiveFrom, effectiveTo, excludeProfileId);
  }
}

function BuildUseCase(repo: IWarehouseProfileRepository): ActivateWarehouseProfileUseCase {
  const guard = new ProfileActivationGuard(repo, CleanPreview());
  return new ActivateWarehouseProfileUseCase(repo, new WarehouseProfilePolicyValidator(), guard);
}

describe('ActivateWarehouseProfileUseCase transactional overlap guarantee (architecture 5.2)', () => {
  it('runs the overlap check and the status write inside a single transaction', async () => {
    const repo = new TransactionTrackingRepository();
    await BuildDraft(repo, 'p-1', D('2026-01-01'));

    const result = await BuildUseCase(repo).Execute({ Id: 'p-1' });

    expect(result.Status).toBe(WarehouseProfileStatus.Active);
    expect(repo.TransactionCount).toBe(1);
    expect(repo.OverlapCheckedInsideTransaction).toBe(true);
  });

  it('still blocks an overlapping activation when the check runs inside the transaction', async () => {
    const repo = new TransactionTrackingRepository();
    await BuildDraft(repo, 'p-active', D('2026-01-01'));
    await BuildUseCase(repo).Execute({ Id: 'p-active' });

    await BuildDraft(repo, 'p-draft', D('2026-06-01'));
    await expect(BuildUseCase(repo).Execute({ Id: 'p-draft' })).rejects.toBeInstanceOf(ConflictException);

    const stillDraft = await repo.FindById('p-draft');
    expect(stillDraft?.Status).toBe(WarehouseProfileStatus.Draft);
  });
});
