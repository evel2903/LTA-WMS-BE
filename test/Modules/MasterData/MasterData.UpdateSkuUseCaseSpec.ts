import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UpdateSkuUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuUseCase';
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

const Owner = () =>
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
  });

const Uom = (id = 'uom-ea') =>
  new UomEntity({
    Id: id,
    UomCode: id.toUpperCase(),
    UomName: id,
    UomType: 'Quantity',
    DecimalPrecision: 0,
    Status: MasterDataStatus.Active,
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
    DefaultOwnerId: null,
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
  skus.FindById.mockResolvedValue(Sku());
  skus.FindByCode.mockResolvedValue(null);
  owners.FindById.mockResolvedValue(Owner());
  uoms.FindById.mockImplementation(async (id) => Uom(id));
  skus.Update.mockImplementation(async (sku) => sku);
  return { owners, uoms, skus, useCase: new UpdateSkuUseCase(skus, owners, uoms) };
};

describe('UpdateSkuUseCase', () => {
  it('updates SKU and validates invariants against target state', async () => {
    const { useCase } = buildUseCase();

    const updated = await useCase.Execute({
      Id: 'sku-1',
      SkuName: 'Updated SKU',
      OwnerControlled: true,
      DefaultOwnerId: 'owner-1',
      ExpiryControlled: true,
      ShelfLifeDays: 365,
    });

    expect(updated.SkuName).toBe('Updated SKU');
    expect(updated.OwnerControlled).toBe(true);
    expect(updated.DefaultOwnerId).toBe('owner-1');
  });

  it('throws NotFoundException when SKU is missing', async () => {
    const { skus, useCase } = buildUseCase();
    skus.FindById.mockResolvedValue(null);

    await expect(useCase.Execute({ Id: 'missing-sku', SkuName: 'Missing' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when updating SkuCode to a global duplicate', async () => {
    const { skus, useCase } = buildUseCase();
    skus.FindByCode.mockResolvedValue(Sku({ Id: 'sku-2', SkuCode: 'SKU-002' }));

    await expect(useCase.Execute({ Id: 'sku-1', SkuCode: 'SKU-002' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects target state when enabling OwnerControlled without a target owner', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.Execute({ Id: 'sku-1', OwnerControlled: true })).rejects.toBeInstanceOf(BusinessRuleException);
  });
});
