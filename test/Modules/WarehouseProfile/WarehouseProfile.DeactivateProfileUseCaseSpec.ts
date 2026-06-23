import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { DeactivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/DeactivateWarehouseProfileUseCase';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';

const scopeKeyService = new ScopeKeyService();

function SeedProfile(repo: IWarehouseProfileRepository, id: string, status: WarehouseProfileStatus) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return repo.Create(
    new WarehouseProfileEntity({
      Id: id,
      ProfileCode: `WP-${id}`,
      ProfileName: `Profile ${id}`,
      WarehouseTypeCode: 'TIER_1',
      Version: 1,
      Status: status,
      ScopeKey: scopeKeyService.Build({ WarehouseTypeCode: 'TIER_1' }),
      EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      EffectiveTo: null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: 'creator',
      UpdatedBy: 'creator',
    }),
  );
}

describe('DeactivateWarehouseProfileUseCase (AC1/AC4)', () => {
  let repo: IWarehouseProfileRepository;
  let useCase: DeactivateWarehouseProfileUseCase;

  beforeEach(() => {
    repo = new InMemoryWarehouseProfileRepository();
    useCase = new DeactivateWarehouseProfileUseCase(repo);
  });

  it('transitions ACTIVE -> RETIRED and persists the new status (AC1)', async () => {
    await SeedProfile(repo, 'p-active', WarehouseProfileStatus.Active);

    const result = await useCase.Execute({ Id: 'p-active' });

    expect(result.Status).toBe(WarehouseProfileStatus.Retired);
    const reloaded = await repo.FindById('p-active');
    expect(reloaded?.Status).toBe(WarehouseProfileStatus.Retired);
  });

  it('throws NotFoundException when the profile id does not exist (AC1)', async () => {
    await expect(useCase.Execute({ Id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deactivating a DRAFT (non-ACTIVE) profile with BusinessRuleException (AC1)', async () => {
    await SeedProfile(repo, 'p-draft', WarehouseProfileStatus.Draft);
    await expect(useCase.Execute({ Id: 'p-draft' })).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects deactivating an already RETIRED profile with BusinessRuleException (AC1)', async () => {
    await SeedProfile(repo, 'p-retired', WarehouseProfileStatus.Retired);
    await expect(useCase.Execute({ Id: 'p-retired' })).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('stores deactivation actor/reason context in audit_policy.LastDeactivation and reads it back (AC4)', async () => {
    await SeedProfile(repo, 'p-active', WarehouseProfileStatus.Active);

    await useCase.Execute({ Id: 'p-active', ActorUserId: 'admin-9', ReasonCode: 'RETIRE', ReasonNote: 'superseded' });

    const reloaded = await repo.FindById('p-active');
    const lastDeactivation = reloaded?.AuditPolicy.LastDeactivation as Record<string, unknown> | undefined;
    expect(lastDeactivation).toBeDefined();
    expect(lastDeactivation?.ActorUserId).toBe('admin-9');
    expect(lastDeactivation?.ReasonCode).toBe('RETIRE');
    expect(lastDeactivation?.ReasonNote).toBe('superseded');
    expect(typeof lastDeactivation?.DeactivatedAt).toBe('string');
    expect(reloaded?.UpdatedBy).toBe('admin-9');
  });
});
