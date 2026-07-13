import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationProfileUseCase';
import { UpdateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationProfileUseCase';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

class FakeLocationProfileRepository implements ILocationProfileRepository {
  public FindById = jest.fn<Promise<LocationProfileEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<LocationProfileEntity | null>, [string]>();
  public Create = jest.fn<Promise<LocationProfileEntity>, [LocationProfileEntity]>();
  public Update = jest.fn<Promise<LocationProfileEntity>, [LocationProfileEntity]>();
  public List = jest.fn<Promise<{ Items: LocationProfileEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeLocationRepository implements ILocationRepository {
  public FindById = jest.fn<Promise<LocationEntity | null>, [string]>();
  public FindByWarehouseAndCode = jest.fn<Promise<LocationEntity | null>, [string, string]>();
  public FindByPhysicalAddress = jest.fn<Promise<LocationEntity | null>, [string, string, unknown]>();
  public Create = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public Update = jest.fn<Promise<LocationEntity>, [LocationEntity]>();
  public List = jest
    .fn<Promise<{ Items: LocationEntity[]; TotalItems: number }>, [number, number, unknown?]>()
    .mockResolvedValue({ Items: [], TotalItems: 0 });
  public ListForTree = jest.fn<Promise<LocationEntity[]>, [string, string?]>();
}

const Profile = (overrides: Partial<LocationProfileEntity> = {}) =>
  new LocationProfileEntity({
    Id: overrides.Id ?? 'profile-1',
    ProfileCode: overrides.ProfileCode ?? 'BIN-DRY',
    ProfileName: overrides.ProfileName ?? 'Dry Bin',
    LocationType: overrides.LocationType ?? 'BIN',
    Version: overrides.Version ?? 1,
    Status: overrides.Status ?? MasterDataStatus.Active,
    CapacityPolicy: overrides.CapacityPolicy ?? {},
    EligibilityPolicy: overrides.EligibilityPolicy ?? {},
    MixPolicy: overrides.MixPolicy ?? {},
    CompliancePolicy: overrides.CompliancePolicy ?? {},
    OperationPolicy: overrides.OperationPolicy ?? {},
    SourceSystem: overrides.SourceSystem ?? null,
    ReferenceId: overrides.ReferenceId ?? null,
    CreatedAt: overrides.CreatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: overrides.UpdatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: overrides.CreatedBy ?? null,
    UpdatedBy: overrides.UpdatedBy ?? null,
  });

describe('LocationProfile use cases', () => {
  it('creates an active LocationProfile and preserves policy JSON objects', async () => {
    const profiles = new FakeLocationProfileRepository();
    profiles.FindByCode.mockResolvedValue(null);
    profiles.Create.mockImplementation(async (profile) => profile);

    const useCase = new CreateLocationProfileUseCase(profiles);
    const created = await useCase.Execute({
      ProfileCode: 'BIN-DRY',
      ProfileName: 'Dry Bin',
      LocationType: 'BIN',
      Status: MasterDataStatus.Active,
      CapacityPolicy: { RequireCapacityQty: true },
      EligibilityPolicy: { AllowedStatuses: ['Active'] },
      MixPolicy: { MixSkuPolicy: 'SingleSku' },
      CompliancePolicy: { RequiredTemperatureClass: 'AMBIENT' },
      OperationPolicy: { PickSequenceRequired: true },
    });

    expect(profiles.FindByCode).toHaveBeenCalledWith('BIN-DRY');
    expect(created.ProfileCode).toBe('BIN-DRY');
    expect(created.Version).toBe(1);
    expect(created.CapacityPolicy).toEqual({ RequireCapacityQty: true });
    expect(created.OperationPolicy).toEqual({ PickSequenceRequired: true });
  });

  it('throws ConflictException when ProfileCode already exists', async () => {
    const profiles = new FakeLocationProfileRepository();
    profiles.FindByCode.mockResolvedValue(Profile());

    const useCase = new CreateLocationProfileUseCase(profiles);

    await expect(
      useCase.Execute({
        ProfileCode: 'BIN-DRY',
        ProfileName: 'Dry Bin',
        LocationType: 'BIN',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws BusinessRuleException when an active profile has no LocationType', async () => {
    const profiles = new FakeLocationProfileRepository();
    profiles.FindByCode.mockResolvedValue(null);

    const useCase = new CreateLocationProfileUseCase(profiles);

    await expect(
      useCase.Execute({
        ProfileCode: 'BIN-DRY',
        ProfileName: 'Dry Bin',
        LocationType: '',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws BusinessRuleException when an active profile has a whitespace-only LocationType', async () => {
    const profiles = new FakeLocationProfileRepository();
    profiles.FindByCode.mockResolvedValue(null);

    const useCase = new CreateLocationProfileUseCase(profiles);

    await expect(
      useCase.Execute({
        ProfileCode: 'BIN-DRY',
        ProfileName: 'Dry Bin',
        LocationType: '   ',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(profiles.Create).not.toHaveBeenCalled();
  });

  it('updates a profile and keeps policy fields defaulted when omitted', async () => {
    const profiles = new FakeLocationProfileRepository();
    const locations = new FakeLocationRepository();
    profiles.FindById.mockResolvedValue(Profile({ CapacityPolicy: { RequireCapacityQty: true } }));
    profiles.Update.mockImplementation(async (profile) => profile);

    const useCase = new UpdateLocationProfileUseCase(profiles, locations);
    const updated = await useCase.Execute({ Id: 'profile-1', ProfileName: 'Dry Bin Updated' });

    expect(updated.ProfileName).toBe('Dry Bin Updated');
    expect(updated.CapacityPolicy).toEqual({ RequireCapacityQty: true });
    expect(locations.List).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating a missing profile', async () => {
    const profiles = new FakeLocationProfileRepository();
    const locations = new FakeLocationRepository();
    profiles.FindById.mockResolvedValue(null);

    const useCase = new UpdateLocationProfileUseCase(profiles, locations);

    await expect(useCase.Execute({ Id: 'missing-profile', ProfileName: 'Missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows changing LocationType when no location references the profile', async () => {
    const profiles = new FakeLocationProfileRepository();
    const locations = new FakeLocationRepository();
    profiles.FindById.mockResolvedValue(Profile({ LocationType: 'BIN' }));
    profiles.Update.mockImplementation(async (profile) => profile);
    locations.List.mockResolvedValue({ Items: [], TotalItems: 0 });

    const useCase = new UpdateLocationProfileUseCase(profiles, locations);
    const updated = await useCase.Execute({ Id: 'profile-1', LocationType: 'RACK' });

    expect(updated.LocationType).toBe('RACK');
    expect(locations.List).toHaveBeenCalledWith(0, 1, { LocationProfileId: 'profile-1' });
  });

  it('throws BusinessRuleException when changing LocationType while a location references the profile', async () => {
    const profiles = new FakeLocationProfileRepository();
    const locations = new FakeLocationRepository();
    profiles.FindById.mockResolvedValue(Profile({ LocationType: 'BIN' }));
    locations.List.mockResolvedValue({ Items: [], TotalItems: 1 });

    const useCase = new UpdateLocationProfileUseCase(profiles, locations);

    await expect(useCase.Execute({ Id: 'profile-1', LocationType: 'RACK' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
    expect(profiles.Update).not.toHaveBeenCalled();
  });

  it('does not check locations when LocationType is unchanged', async () => {
    const profiles = new FakeLocationProfileRepository();
    const locations = new FakeLocationRepository();
    profiles.FindById.mockResolvedValue(Profile({ LocationType: 'BIN' }));
    profiles.Update.mockImplementation(async (profile) => profile);

    const useCase = new UpdateLocationProfileUseCase(profiles, locations);
    await useCase.Execute({ Id: 'profile-1', LocationType: 'BIN', ProfileName: 'Renamed' });

    expect(locations.List).not.toHaveBeenCalled();
  });
});
