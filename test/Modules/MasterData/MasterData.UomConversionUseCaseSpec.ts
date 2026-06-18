import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/CreateUomConversionUseCase';
import { IUomConversionRepository } from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

class FakeUomConversionRepository implements IUomConversionRepository {
  public FindById = jest.fn<Promise<UomConversionEntity | null>, [string]>();
  public FindByUniqueKey = jest.fn<Promise<UomConversionEntity | null>, [string, string, string, Date]>();
  public FindActiveOverlap = jest.fn<
    Promise<UomConversionEntity | null>,
    [string, string, string, Date, Date | null, string?]
  >();
  public Create = jest.fn<Promise<UomConversionEntity>, [UomConversionEntity]>();
  public Update = jest.fn<Promise<UomConversionEntity>, [UomConversionEntity]>();
  public List = jest.fn<Promise<{ Items: UomConversionEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeSkuRepository implements ISkuRepository {
  public FindById = jest.fn<Promise<SkuEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<SkuEntity | null>, [string]>();
  public Create = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public Update = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public List = jest.fn<Promise<{ Items: SkuEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

class FakeUomRepository implements IUomRepository {
  public FindById = jest.fn<Promise<UomEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<UomEntity | null>, [string]>();
  public Create = jest.fn<Promise<UomEntity>, [UomEntity]>();
  public Update = jest.fn<Promise<UomEntity>, [UomEntity]>();
  public List = jest.fn<Promise<{ Items: UomEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Sku = () =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-001',
    SkuName: 'SKU 001',
    ItemClass: 'DRY',
    ItemStatus: SkuStatus.Active,
    BaseUomId: 'uom-ea',
    InventoryUomId: 'uom-ea',
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Uom = () =>
  new UomEntity({
    Id: 'uom-ea',
    UomCode: 'EA',
    UomName: 'Each',
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const ExistingConversion = () =>
  new UomConversionEntity({
    Id: 'conversion-1',
    SkuId: 'sku-1',
    FromUomId: 'uom-case',
    ToUomId: 'uom-ea',
    Factor: 12,
    EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    EffectiveTo: null,
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const buildUseCase = () => {
  const conversions = new FakeUomConversionRepository();
  const skus = new FakeSkuRepository();
  const uoms = new FakeUomRepository();
  conversions.FindByUniqueKey.mockResolvedValue(null);
  conversions.FindActiveOverlap.mockResolvedValue(null);
  conversions.Create.mockImplementation(async (conversion) => conversion);
  skus.FindById.mockResolvedValue(Sku());
  uoms.FindById.mockResolvedValue(Uom());
  return { conversions, skus, uoms, useCase: new CreateUomConversionUseCase(conversions, skus, uoms) };
};

describe('CreateUomConversionUseCase', () => {
  it('creates conversion for active SKU and UOMs with positive factor and effective date', async () => {
    const { useCase } = buildUseCase();

    const created = await useCase.Execute({
      SkuId: 'sku-1',
      FromUomId: 'uom-case',
      ToUomId: 'uom-ea',
      Factor: 12,
      EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      Status: MasterDataStatus.Active,
    });

    expect(created.Factor).toBe(12);
    expect(created.FromUomId).toBe('uom-case');
    expect(created.ToUomId).toBe('uom-ea');
  });

  it('rejects invalid factor, same UOM and invalid effective range', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        FromUomId: 'uom-ea',
        ToUomId: 'uom-ea',
        Factor: 12,
        EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        FromUomId: 'uom-case',
        ToUomId: 'uom-ea',
        Factor: 0,
        EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        FromUomId: 'uom-case',
        ToUomId: 'uom-ea',
        Factor: 12,
        EffectiveFrom: new Date('2026-02-01T00:00:00.000Z'),
        EffectiveTo: new Date('2026-01-01T00:00:00.000Z'),
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects duplicate unique key and overlapping active windows', async () => {
    const { conversions, useCase } = buildUseCase();
    conversions.FindByUniqueKey.mockResolvedValue(ExistingConversion());

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        FromUomId: 'uom-case',
        ToUomId: 'uom-ea',
        Factor: 12,
        EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    conversions.FindByUniqueKey.mockResolvedValue(null);
    conversions.FindActiveOverlap.mockResolvedValue(ExistingConversion());

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        FromUomId: 'uom-case',
        ToUomId: 'uom-ea',
        Factor: 12,
        EffectiveFrom: new Date('2026-01-15T00:00:00.000Z'),
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects missing SKU or UOM references even when conversion is inactive', async () => {
    const { skus, uoms, useCase } = buildUseCase();
    skus.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        SkuId: 'missing-sku',
        FromUomId: 'uom-case',
        ToUomId: 'uom-ea',
        Factor: 12,
        EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    skus.FindById.mockResolvedValue(Sku());
    uoms.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        FromUomId: 'missing-uom',
        ToUomId: 'uom-ea',
        Factor: 12,
        EffectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
