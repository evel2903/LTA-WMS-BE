import { ConflictException } from '@common/Exceptions/AppException';
import { CreateUomUseCase } from '@modules/MasterData/Application/UseCases/CreateUomUseCase';
import { ListUomsUseCase } from '@modules/MasterData/Application/UseCases/ListUomsUseCase';
import { UpdateUomUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomUseCase';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

class FakeUomRepository implements IUomRepository {
  public FindById = jest.fn<Promise<UomEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<UomEntity | null>, [string]>();
  public Create = jest.fn<Promise<UomEntity>, [UomEntity]>();
  public Update = jest.fn<Promise<UomEntity>, [UomEntity]>();
  public List = jest.fn<Promise<{ Items: UomEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Uom = (overrides: Partial<ConstructorParameters<typeof UomEntity>[0]> = {}) =>
  new UomEntity({
    Id: 'uom-1',
    UomCode: 'EA',
    UomName: 'Each',
    UomType: 'Quantity',
    DecimalPrecision: 0,
    Status: MasterDataStatus.Active,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
    ...overrides,
  });

describe('UOM use cases', () => {
  it('creates UOM with precision and type', async () => {
    const uoms = new FakeUomRepository();
    uoms.FindByCode.mockResolvedValue(null);
    uoms.Create.mockImplementation(async (uom) => uom);

    const created = await new CreateUomUseCase(uoms).Execute({
      UomCode: 'EA',
      UomName: 'Each',
      UomType: 'Quantity',
      DecimalPrecision: 0,
      Status: MasterDataStatus.Active,
    });

    expect(uoms.FindByCode).toHaveBeenCalledWith('EA');
    expect(created.UomCode).toBe('EA');
    expect(created.DecimalPrecision).toBe(0);
  });

  it('defaults DecimalPrecision to 0 when omitted', async () => {
    const uoms = new FakeUomRepository();
    uoms.FindByCode.mockResolvedValue(null);
    uoms.Create.mockImplementation(async (uom) => uom);

    const created = await new CreateUomUseCase(uoms).Execute({
      UomCode: 'BOX',
      UomName: 'Box',
      Status: MasterDataStatus.Active,
    });

    expect(created.DecimalPrecision).toBe(0);
  });

  it('throws ConflictException when UomCode already exists', async () => {
    const uoms = new FakeUomRepository();
    uoms.FindByCode.mockResolvedValue(Uom({ UomCode: 'EA' }));

    await expect(
      new CreateUomUseCase(uoms).Execute({
        UomCode: 'EA',
        UomName: 'Each',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when updating UomCode to an existing code', async () => {
    const uoms = new FakeUomRepository();
    uoms.FindById.mockResolvedValue(Uom({ Id: 'uom-1', UomCode: 'EA' }));
    uoms.FindByCode.mockResolvedValue(Uom({ Id: 'uom-2', UomCode: 'BOX' }));

    await expect(
      new UpdateUomUseCase(uoms).Execute({
        Id: 'uom-1',
        UomCode: 'BOX',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists UOMs with pagination and code/name/status/type filters', async () => {
    const uoms = new FakeUomRepository();
    uoms.List.mockResolvedValue({ Items: [Uom()], TotalItems: 1 });

    const result = await new ListUomsUseCase(uoms).Execute({
      Page: 1,
      PageSize: 20,
      UomCode: 'EA',
      UomName: 'Each',
      UomType: 'Quantity',
      Status: MasterDataStatus.Active,
    });

    expect(uoms.List).toHaveBeenCalledWith(0, 20, {
      UomCode: 'EA',
      UomName: 'Each',
      UomType: 'Quantity',
      Status: MasterDataStatus.Active,
    });
    expect(result.Meta.TotalItems).toBe(1);
  });
});
