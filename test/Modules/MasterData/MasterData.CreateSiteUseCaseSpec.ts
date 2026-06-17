import { ConflictException } from '@common/Exceptions/AppException';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

class FakeSiteRepository implements ISiteRepository {
  public FindById = jest.fn<Promise<SiteEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<SiteEntity | null>, [string]>();
  public Create = jest.fn<Promise<SiteEntity>, [SiteEntity]>();
  public Update = jest.fn<Promise<SiteEntity>, [SiteEntity]>();
  public List = jest.fn<Promise<{ Items: SiteEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const ExistingSite = (overrides: Partial<ConstructorParameters<typeof SiteEntity>[0]> = {}) =>
  new SiteEntity({
    Id: 'site-existing',
    SiteCode: 'SITE-EXISTING',
    SiteName: 'Existing Site',
    Status: MasterDataStatus.Active,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
    ...overrides,
  });

describe('CreateSiteUseCase', () => {
  it('creates Site when SiteCode is globally unique', async () => {
    const repo = new FakeSiteRepository();
    repo.FindByCode.mockResolvedValue(null);
    repo.Create.mockImplementation(async (site) => site);

    const useCase = new CreateSiteUseCase(repo);
    const created = await useCase.Execute({
      SiteCode: 'SITE-HCM',
      SiteName: 'Ho Chi Minh Site',
      Status: MasterDataStatus.Active,
      SourceSystem: 'ERP',
      ReferenceId: 'ERP-SITE-HCM',
    });

    expect(repo.FindByCode).toHaveBeenCalledWith('SITE-HCM');
    expect(repo.Create).toHaveBeenCalledTimes(1);
    expect(created.SiteCode).toBe('SITE-HCM');
    expect(created.Status).toBe(MasterDataStatus.Active);
    expect(created.SourceSystem).toBe('ERP');
  });

  it('throws ConflictException when SiteCode already exists', async () => {
    const repo = new FakeSiteRepository();
    repo.FindByCode.mockResolvedValue(ExistingSite({ SiteCode: 'SITE-HCM' }));

    const useCase = new CreateSiteUseCase(repo);

    await expect(
      useCase.Execute({
        SiteCode: 'SITE-HCM',
        SiteName: 'Ho Chi Minh Site',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
