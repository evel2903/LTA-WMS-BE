import { ConflictException } from '@common/Exceptions/AppException';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { GetWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetWarehouseProfileUseCase';
import { ListWarehouseProfilesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfilesUseCase';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import {
  InMemoryWarehouseProfileRepository,
  MasterDataReferenceStub,
} from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';

const BuildUseCase = (overrides?: {
  profiles?: InMemoryWarehouseProfileRepository;
  refs?: MasterDataReferenceStub;
}) => {
  const profiles = overrides?.profiles ?? new InMemoryWarehouseProfileRepository();
  const refs = overrides?.refs ?? new MasterDataReferenceStub();
  const useCase = new CreateWarehouseProfileUseCase(
    profiles,
    refs.Warehouses,
    refs.Zones,
    refs.Owners,
    refs.Skus,
    new ScopeKeyService(),
    new WarehouseProfilePolicyValidator(),
  );
  return { useCase, profiles, refs };
};

describe('CreateWarehouseProfileUseCase', () => {
  it('creates a profile at status DRAFT by default and assigns a generated id', async () => {
    const { useCase, profiles } = BuildUseCase();

    const created = await useCase.Execute({
      ProfileCode: 'WP-TIER1',
      ProfileName: 'Tier 1 Profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });

    expect(created.Status).toBe(WarehouseProfileStatus.Draft);
    expect(created.Id).toEqual(expect.any(String));
    expect(created.Version).toBe(1);
    expect(await profiles.FindById(created.Id)).not.toBeNull();
  });

  it('computes and persists a ScopeKey from the six axes', async () => {
    const { useCase } = BuildUseCase();
    const expectedKey = new ScopeKeyService().Build({ WarehouseTypeCode: 'TIER_1' });

    const created = await useCase.Execute({
      ProfileCode: 'WP-TIER1',
      ProfileName: 'Tier 1 Profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });

    expect(created.ScopeKey).toBe(expectedKey);
  });

  it('rejects a duplicate ProfileCode with ConflictException (pre-check)', async () => {
    const { useCase } = BuildUseCase();
    await useCase.Execute({
      ProfileCode: 'WP-DUP',
      ProfileName: 'First',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });

    await expect(
      useCase.Execute({
        ProfileCode: 'WP-DUP',
        ProfileName: 'Second',
        WarehouseTypeCode: 'TIER_1',
        EffectiveFrom: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the stored profile via GetWarehouseProfileUseCase', async () => {
    const { useCase, profiles } = BuildUseCase();
    const created = await useCase.Execute({
      ProfileCode: 'WP-GET',
      ProfileName: 'Get Profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });

    const fetched = await new GetWarehouseProfileUseCase(profiles).Execute(created.Id);

    expect(fetched.Id).toBe(created.Id);
    expect(fetched.ProfileCode).toBe('WP-GET');
  });

  it('lists profiles in an { Items, Meta } envelope', async () => {
    const { useCase, profiles } = BuildUseCase();
    await useCase.Execute({
      ProfileCode: 'WP-A',
      ProfileName: 'A',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
    });

    const result = await new ListWarehouseProfilesUseCase(profiles).Execute({});

    expect(result.Items).toHaveLength(1);
    expect(result.Meta.TotalItems).toBe(1);
    expect(result.Meta.Page).toBe(1);
  });
});
