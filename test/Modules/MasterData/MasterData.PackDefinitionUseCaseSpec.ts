import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/CreatePackDefinitionUseCase';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

class FakePackDefinitionRepository implements IPackDefinitionRepository {
  public FindById = jest.fn<Promise<PackDefinitionEntity | null>, [string]>();
  public FindBySkuAndPackCode = jest.fn<Promise<PackDefinitionEntity | null>, [string, string]>();
  public FindActiveDefaultBySkuId = jest.fn<Promise<PackDefinitionEntity | null>, [string]>();
  public Create = jest.fn<Promise<PackDefinitionEntity>, [PackDefinitionEntity]>();
  public Update = jest.fn<Promise<PackDefinitionEntity>, [PackDefinitionEntity]>();
  public List = jest.fn<Promise<{ Items: PackDefinitionEntity[]; TotalItems: number }>, [number, number, unknown?]>();
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

const Sku = (status = SkuStatus.Active) =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-001',
    SkuName: 'SKU 001',
    ItemClass: 'DRY',
    ItemStatus: status,
    BaseUomId: 'uom-ea',
    InventoryUomId: 'uom-ea',
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Uom = (status = MasterDataStatus.Active) =>
  new UomEntity({
    Id: 'uom-ea',
    UomCode: 'EA',
    UomName: 'Each',
    Status: status,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const ExistingPack = () =>
  new PackDefinitionEntity({
    Id: 'pack-existing',
    SkuId: 'sku-1',
    PackCode: 'CASE',
    PackName: 'Case',
    UomId: 'uom-ea',
    QuantityPerPack: 12,
    IsDefault: true,
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const buildUseCase = () => {
  const packs = new FakePackDefinitionRepository();
  const skus = new FakeSkuRepository();
  const uoms = new FakeUomRepository();
  packs.FindBySkuAndPackCode.mockResolvedValue(null);
  packs.FindActiveDefaultBySkuId.mockResolvedValue(null);
  packs.Create.mockImplementation(async (pack) => pack);
  skus.FindById.mockResolvedValue(Sku());
  uoms.FindById.mockResolvedValue(Uom());
  return { packs, skus, uoms, useCase: new CreatePackDefinitionUseCase(packs, skus, uoms) };
};

describe('CreatePackDefinitionUseCase', () => {
  it('creates pack definition for active SKU and UOM with positive quantity', async () => {
    const { useCase } = buildUseCase();

    const created = await useCase.Execute({
      SkuId: 'sku-1',
      PackCode: 'CASE',
      PackName: 'Case',
      UomId: 'uom-ea',
      QuantityPerPack: 12,
      IsDefault: true,
      Status: MasterDataStatus.Active,
    });

    expect(created.PackCode).toBe('CASE');
    expect(created.QuantityPerPack).toBe(12);
    expect(created.IsDefault).toBe(true);
  });

  it('rejects duplicate PackCode within the same SKU', async () => {
    const { packs, useCase } = buildUseCase();
    packs.FindBySkuAndPackCode.mockResolvedValue(ExistingPack());

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        PackCode: 'CASE',
        PackName: 'Case',
        UomId: 'uom-ea',
        QuantityPerPack: 12,
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects second active default pack on the same SKU', async () => {
    const { packs, useCase } = buildUseCase();
    packs.FindActiveDefaultBySkuId.mockResolvedValue(ExistingPack());

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        PackCode: 'INNER',
        PackName: 'Inner',
        UomId: 'uom-ea',
        QuantityPerPack: 6,
        IsDefault: true,
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects inactive references and non-positive quantity', async () => {
    const { skus, useCase } = buildUseCase();
    skus.FindById.mockResolvedValue(Sku(SkuStatus.Blocked));

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        PackCode: 'CASE',
        PackName: 'Case',
        UomId: 'uom-ea',
        QuantityPerPack: 12,
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    skus.FindById.mockResolvedValue(Sku());

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        PackCode: 'CASE',
        PackName: 'Case',
        UomId: 'uom-ea',
        QuantityPerPack: 0,
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects missing SKU or UOM references even when pack is inactive', async () => {
    const { skus, uoms, useCase } = buildUseCase();
    skus.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        SkuId: 'missing-sku',
        PackCode: 'CASE',
        PackName: 'Case',
        UomId: 'uom-ea',
        QuantityPerPack: 12,
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    skus.FindById.mockResolvedValue(Sku());
    uoms.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        SkuId: 'sku-1',
        PackCode: 'CASE',
        PackName: 'Case',
        UomId: 'missing-uom',
        QuantityPerPack: 12,
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
