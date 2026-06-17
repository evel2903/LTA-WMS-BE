import { ConflictException } from '@common/Exceptions/AppException';
import { CreateOwnerUseCase } from '@modules/MasterData/Application/UseCases/CreateOwnerUseCase';
import { ListOwnersUseCase } from '@modules/MasterData/Application/UseCases/ListOwnersUseCase';
import { UpdateOwnerUseCase } from '@modules/MasterData/Application/UseCases/UpdateOwnerUseCase';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

class FakeOwnerRepository implements IOwnerRepository {
  public FindById = jest.fn<Promise<OwnerEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<OwnerEntity | null>, [string]>();
  public Create = jest.fn<Promise<OwnerEntity>, [OwnerEntity]>();
  public Update = jest.fn<Promise<OwnerEntity>, [OwnerEntity]>();
  public List = jest.fn<Promise<{ Items: OwnerEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Owner = (overrides: Partial<ConstructorParameters<typeof OwnerEntity>[0]> = {}) =>
  new OwnerEntity({
    Id: 'owner-1',
    OwnerCode: 'OWNER-A',
    OwnerName: 'Owner A',
    Status: MasterDataStatus.Active,
    BillingPolicy: {},
    VisibilityScope: {},
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
    ...overrides,
  });

describe('Owner use cases', () => {
  it('creates Owner with BillingPolicy and VisibilityScope objects', async () => {
    const owners = new FakeOwnerRepository();
    owners.FindByCode.mockResolvedValue(null);
    owners.Create.mockImplementation(async (owner) => owner);

    const created = await new CreateOwnerUseCase(owners).Execute({
      OwnerCode: 'OWNER-A',
      OwnerName: 'Owner A',
      Status: MasterDataStatus.Active,
      BillingPolicy: { BillingCycle: 'MONTHLY' },
      VisibilityScope: { Warehouses: ['WH-HCM'] },
      SourceSystem: 'ERP',
      ReferenceId: 'ERP-OWNER-A',
    });

    expect(owners.FindByCode).toHaveBeenCalledWith('OWNER-A');
    expect(created.OwnerCode).toBe('OWNER-A');
    expect(created.BillingPolicy).toEqual({ BillingCycle: 'MONTHLY' });
    expect(created.VisibilityScope).toEqual({ Warehouses: ['WH-HCM'] });
    expect(created.SourceSystem).toBe('ERP');
  });

  it('normalizes missing policy objects to empty objects', async () => {
    const owners = new FakeOwnerRepository();
    owners.FindByCode.mockResolvedValue(null);
    owners.Create.mockImplementation(async (owner) => owner);

    const created = await new CreateOwnerUseCase(owners).Execute({
      OwnerCode: 'OWNER-A',
      OwnerName: 'Owner A',
      Status: MasterDataStatus.Active,
    });

    expect(created.BillingPolicy).toEqual({});
    expect(created.VisibilityScope).toEqual({});
  });

  it('throws ConflictException when OwnerCode already exists', async () => {
    const owners = new FakeOwnerRepository();
    owners.FindByCode.mockResolvedValue(Owner({ OwnerCode: 'OWNER-A' }));

    await expect(
      new CreateOwnerUseCase(owners).Execute({
        OwnerCode: 'OWNER-A',
        OwnerName: 'Owner A',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when updating OwnerCode to an existing code', async () => {
    const owners = new FakeOwnerRepository();
    owners.FindById.mockResolvedValue(Owner({ Id: 'owner-1', OwnerCode: 'OWNER-A' }));
    owners.FindByCode.mockResolvedValue(Owner({ Id: 'owner-2', OwnerCode: 'OWNER-B' }));

    await expect(
      new UpdateOwnerUseCase(owners).Execute({
        Id: 'owner-1',
        OwnerCode: 'OWNER-B',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists owners with pagination and code/name/status filters', async () => {
    const owners = new FakeOwnerRepository();
    owners.List.mockResolvedValue({ Items: [Owner()], TotalItems: 1 });

    const result = await new ListOwnersUseCase(owners).Execute({
      Page: 2,
      PageSize: 10,
      OwnerCode: 'OWNER',
      OwnerName: 'Owner',
      Status: MasterDataStatus.Active,
    });

    expect(owners.List).toHaveBeenCalledWith(10, 10, {
      OwnerCode: 'OWNER',
      OwnerName: 'Owner',
      Status: MasterDataStatus.Active,
    });
    expect(result.Meta.TotalItems).toBe(1);
  });
});
