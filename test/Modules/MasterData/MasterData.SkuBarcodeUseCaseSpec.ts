import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuBarcodeUseCase';
import { ResolveSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/ResolveSkuBarcodeUseCase';
import { UpdateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuBarcodeUseCase';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

class FakeSkuBarcodeRepository implements ISkuBarcodeRepository {
  public FindById = jest.fn<Promise<SkuBarcodeEntity | null>, [string]>();
  public FindByValueAndOwner = jest.fn<Promise<SkuBarcodeEntity | null>, [string, string | null]>();
  public FindCandidatesByValue = jest.fn<Promise<SkuBarcodeEntity[]>, [string]>();
  public Create = jest.fn<Promise<SkuBarcodeEntity>, [SkuBarcodeEntity]>();
  public Update = jest.fn<Promise<SkuBarcodeEntity>, [SkuBarcodeEntity]>();
  public List = jest.fn<Promise<{ Items: SkuBarcodeEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

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

class FakeOwnerRepository implements IOwnerRepository {
  public FindById = jest.fn<Promise<OwnerEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<OwnerEntity | null>, [string]>();
  public Create = jest.fn<Promise<OwnerEntity>, [OwnerEntity]>();
  public Update = jest.fn<Promise<OwnerEntity>, [OwnerEntity]>();
  public List = jest.fn<Promise<{ Items: OwnerEntity[]; TotalItems: number }>, [number, number, unknown?]>();
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

const Owner = (status = MasterDataStatus.Active) =>
  new OwnerEntity({
    Id: 'owner-1',
    OwnerCode: 'OWNER-A',
    OwnerName: 'Owner A',
    Status: status,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const Pack = () =>
  new PackDefinitionEntity({
    Id: 'pack-case',
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

const Barcode = () =>
  new SkuBarcodeEntity({
    Id: 'barcode-1',
    SkuId: 'sku-1',
    OwnerId: 'owner-1',
    UomId: 'uom-ea',
    PackCode: 'CASE',
    BarcodeValue: '0123456789012',
    BarcodeType: 'EAN13',
    IsPrimary: true,
    Status: MasterDataStatus.Active,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const buildUseCases = () => {
  const barcodes = new FakeSkuBarcodeRepository();
  const packs = new FakePackDefinitionRepository();
  const skus = new FakeSkuRepository();
  const owners = new FakeOwnerRepository();
  const uoms = new FakeUomRepository();
  barcodes.FindByValueAndOwner.mockResolvedValue(null);
  barcodes.Create.mockImplementation(async (barcode) => barcode);
  barcodes.FindById.mockResolvedValue(Barcode());
  barcodes.Update.mockImplementation(async (barcode) => barcode);
  packs.FindBySkuAndPackCode.mockResolvedValue(Pack());
  skus.FindById.mockResolvedValue(Sku());
  owners.FindById.mockResolvedValue(Owner());
  uoms.FindById.mockResolvedValue(Uom());
  return {
    barcodes,
    packs,
    skus,
    owners,
    uoms,
    createUseCase: new CreateSkuBarcodeUseCase(barcodes, packs, skus, owners, uoms),
    updateUseCase: new UpdateSkuBarcodeUseCase(barcodes, packs, skus, owners, uoms),
    resolveUseCase: new ResolveSkuBarcodeUseCase(barcodes),
  };
};

describe('SkuBarcode use cases', () => {
  it('creates active barcode with valid SKU, owner, UOM and pack context', async () => {
    const { createUseCase } = buildUseCases();

    const created = await createUseCase.Execute({
      SkuId: 'sku-1',
      OwnerId: 'owner-1',
      UomId: 'uom-ea',
      PackCode: 'CASE',
      BarcodeValue: '0123456789012',
      BarcodeType: 'EAN13',
      IsPrimary: true,
      Status: MasterDataStatus.Active,
    });

    expect(created.SkuId).toBe('sku-1');
    expect(created.OwnerId).toBe('owner-1');
    expect(created.UomId).toBe('uom-ea');
    expect(created.PackCode).toBe('CASE');
  });

  it('rejects duplicate barcode value in the same owner scope', async () => {
    const { barcodes, createUseCase } = buildUseCases();
    barcodes.FindByValueAndOwner.mockResolvedValue(Barcode());

    await expect(
      createUseCase.Execute({
        SkuId: 'sku-1',
        OwnerId: 'owner-1',
        UomId: 'uom-ea',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows same owner-scoped barcode value for different owner scopes', async () => {
    const { barcodes, createUseCase } = buildUseCases();
    barcodes.FindByValueAndOwner.mockResolvedValue(null);

    await createUseCase.Execute({
      SkuId: 'sku-1',
      OwnerId: 'owner-2',
      UomId: 'uom-ea',
      BarcodeValue: '0123456789012',
      BarcodeType: 'EAN13',
      Status: MasterDataStatus.Active,
    });

    expect(barcodes.FindByValueAndOwner).toHaveBeenCalledWith('0123456789012', 'owner-2');
  });

  it('rejects inactive references and pack/UOM mismatch', async () => {
    const { createUseCase, skus, packs } = buildUseCases();
    skus.FindById.mockResolvedValue(Sku(SkuStatus.Discontinued));

    await expect(
      createUseCase.Execute({
        SkuId: 'sku-1',
        UomId: 'uom-ea',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    skus.FindById.mockResolvedValue(Sku());
    packs.FindBySkuAndPackCode.mockResolvedValue(new PackDefinitionEntity({ ...Pack(), UomId: 'uom-case' }));

    await expect(
      createUseCase.Execute({
        SkuId: 'sku-1',
        UomId: 'uom-ea',
        PackCode: 'CASE',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects inactive barcode when PackCode is missing or mismatched', async () => {
    const { createUseCase, packs, updateUseCase } = buildUseCases();
    packs.FindBySkuAndPackCode.mockResolvedValue(null);

    await expect(
      createUseCase.Execute({
        SkuId: 'sku-1',
        UomId: 'uom-ea',
        PackCode: 'MISSING',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      updateUseCase.Execute({
        Id: 'barcode-1',
        PackCode: 'MISSING',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects missing SKU, UOM or owner references even when barcode is inactive', async () => {
    const { createUseCase, skus, owners, uoms } = buildUseCases();
    skus.FindById.mockResolvedValue(null);

    await expect(
      createUseCase.Execute({
        SkuId: 'missing-sku',
        OwnerId: 'owner-1',
        UomId: 'uom-ea',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    skus.FindById.mockResolvedValue(Sku());
    uoms.FindById.mockResolvedValue(null);

    await expect(
      createUseCase.Execute({
        SkuId: 'sku-1',
        OwnerId: 'owner-1',
        UomId: 'missing-uom',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    uoms.FindById.mockResolvedValue(Uom());
    owners.FindById.mockResolvedValue(null);

    await expect(
      createUseCase.Execute({
        SkuId: 'sku-1',
        OwnerId: 'missing-owner',
        UomId: 'uom-ea',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves barcode to SKU, owner, UOM and pack context', async () => {
    const { barcodes, resolveUseCase } = buildUseCases();
    barcodes.FindByValueAndOwner.mockResolvedValue(Barcode());

    const resolved = await resolveUseCase.Execute({ BarcodeValue: '0123456789012', OwnerId: 'owner-1' });

    expect(resolved.SkuId).toBe('sku-1');
    expect(resolved.OwnerId).toBe('owner-1');
    expect(resolved.UomId).toBe('uom-ea');
    expect(resolved.PackCode).toBe('CASE');
  });

  it('throws NotFoundException when barcode cannot be resolved', async () => {
    const { resolveUseCase } = buildUseCases();

    await expect(resolveUseCase.Execute({ BarcodeValue: 'missing', OwnerId: null })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
