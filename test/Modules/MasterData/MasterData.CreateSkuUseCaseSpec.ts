import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

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

class FakeSkuRepository implements ISkuRepository {
  public FindById = jest.fn<Promise<SkuEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<SkuEntity | null>, [string]>();
  public Create = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public Update = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public List = jest.fn<Promise<{ Items: SkuEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Owner = (status = MasterDataStatus.Active) =>
  new OwnerEntity({
    Id: 'owner-1',
    OwnerCode: 'OWNER-A',
    OwnerName: 'Owner A',
    Status: status,
    BillingPolicy: {},
    VisibilityScope: {},
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Uom = (id: string, status = MasterDataStatus.Active) =>
  new UomEntity({
    Id: id,
    UomCode: id.toUpperCase(),
    UomName: id,
    UomType: 'Quantity',
    DecimalPrecision: 0,
    Status: status,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
  });

const Sku = (overrides: Partial<ConstructorParameters<typeof SkuEntity>[0]> = {}) =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-001',
    SkuName: 'SKU 001',
    DefaultOwnerId: 'owner-1',
    ItemClass: 'DRY',
    ItemStatus: SkuStatus.Active,
    BaseUomId: 'uom-ea',
    InventoryUomId: 'uom-ea',
    LotControlled: false,
    ExpiryControlled: false,
    SerialControlled: false,
    OwnerControlled: false,
    LpnControlled: false,
    TemperatureControlled: false,
    DgControlled: false,
    CustomsControlled: false,
    QcRequired: false,
    TemperatureClass: null,
    DgClass: null,
    BondedFlag: false,
    ShelfLifeDays: null,
    MinRemainingShelfLifeDays: null,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
    ...overrides,
  });

const buildUseCase = () => {
  const owners = new FakeOwnerRepository();
  const uoms = new FakeUomRepository();
  const skus = new FakeSkuRepository();
  owners.FindById.mockResolvedValue(Owner());
  uoms.FindById.mockImplementation(async (id) => Uom(id));
  skus.FindByCode.mockResolvedValue(null);
  skus.Create.mockImplementation(async (sku) => sku);
  return { owners, uoms, skus, useCase: new CreateSkuUseCase(skus, owners, uoms) };
};

describe('CreateSkuUseCase', () => {
  it('creates active SKU with owner, UOMs and rule-facing control flags', async () => {
    const { skus, useCase } = buildUseCase();

    const created = await useCase.Execute({
      SkuCode: 'SKU-001',
      SkuName: 'SKU 001',
      DefaultOwnerId: 'owner-1',
      ItemClass: 'DRY',
      ItemStatus: SkuStatus.Active,
      BaseUomId: 'uom-ea',
      InventoryUomId: 'uom-ea',
      LotControlled: true,
      ExpiryControlled: true,
      ShelfLifeDays: 365,
      SerialControlled: true,
      OwnerControlled: true,
      LpnControlled: true,
      TemperatureControlled: true,
      TemperatureClass: 'CHILLED',
      DgControlled: true,
      DgClass: 'DG-3',
      CustomsControlled: true,
      BondedFlag: true,
      QcRequired: true,
    });

    expect(skus.FindByCode).toHaveBeenCalledWith('SKU-001');
    expect(created.SkuCode).toBe('SKU-001');
    expect(created.LotControlled).toBe(true);
    expect(created.QcRequired).toBe(true);
  });

  it('throws ConflictException when SkuCode already exists globally', async () => {
    const { skus, useCase } = buildUseCase();
    skus.FindByCode.mockResolvedValue(Sku({ SkuCode: 'SKU-001' }));

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-001',
        SkuName: 'SKU 001',
        ItemClass: 'DRY',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException for missing owner or UOM references', async () => {
    const { owners, useCase } = buildUseCase();
    owners.FindById.mockResolvedValue(null);

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-001',
        SkuName: 'SKU 001',
        DefaultOwnerId: 'missing-owner',
        ItemClass: 'DRY',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BusinessRuleException for inactive owner or inactive UOM references', async () => {
    const { owners, uoms, useCase } = buildUseCase();
    owners.FindById.mockResolvedValue(Owner(MasterDataStatus.Inactive));

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-001',
        SkuName: 'SKU 001',
        DefaultOwnerId: 'owner-1',
        ItemClass: 'DRY',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    owners.FindById.mockResolvedValue(Owner());
    uoms.FindById.mockResolvedValue(Uom('uom-ea', MasterDataStatus.Inactive));

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-002',
        SkuName: 'SKU 002',
        ItemClass: 'DRY',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('enforces owner and dependent fields when control flags require them', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-OWNER',
        SkuName: 'Owner Controlled',
        ItemClass: 'DRY',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
        OwnerControlled: true,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-EXP',
        SkuName: 'Expiry Controlled',
        ItemClass: 'DRY',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
        ExpiryControlled: true,
        ShelfLifeDays: 0,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-TEMP',
        SkuName: 'Temperature Controlled',
        ItemClass: 'COLD',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
        TemperatureControlled: true,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-DG',
        SkuName: 'DG Controlled',
        ItemClass: 'DG',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
        DgControlled: true,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    await expect(
      useCase.Execute({
        SkuCode: 'SKU-CUSTOMS',
        SkuName: 'Customs Controlled',
        ItemClass: 'BONDED',
        ItemStatus: SkuStatus.Active,
        BaseUomId: 'uom-ea',
        InventoryUomId: 'uom-ea',
        CustomsControlled: true,
        BondedFlag: false,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });
});
