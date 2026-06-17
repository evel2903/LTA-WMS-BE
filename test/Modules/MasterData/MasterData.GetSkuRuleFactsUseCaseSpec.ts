import { NotFoundException } from '@common/Exceptions/AppException';
import { GetSkuRuleFactsUseCase } from '@modules/MasterData/Application/UseCases/GetSkuRuleFactsUseCase';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

class FakeSkuRepository implements ISkuRepository {
  public FindById = jest.fn<Promise<SkuEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<SkuEntity | null>, [string]>();
  public Create = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public Update = jest.fn<Promise<SkuEntity>, [SkuEntity]>();
  public List = jest.fn<Promise<{ Items: SkuEntity[]; TotalItems: number }>, [number, number, unknown?]>();
}

const Sku = (overrides: Partial<ConstructorParameters<typeof SkuEntity>[0]> = {}) =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-001',
    SkuName: 'SKU 001',
    DefaultOwnerId: 'owner-1',
    ItemClass: 'PHARMA',
    ItemStatus: SkuStatus.Blocked,
    BaseUomId: 'uom-ea',
    InventoryUomId: 'uom-ea',
    LotControlled: true,
    ExpiryControlled: true,
    SerialControlled: true,
    OwnerControlled: true,
    LpnControlled: true,
    TemperatureControlled: true,
    DgControlled: true,
    CustomsControlled: true,
    QcRequired: true,
    TemperatureClass: 'CHILLED',
    DgClass: 'DG-3',
    BondedFlag: true,
    ShelfLifeDays: 365,
    MinRemainingShelfLifeDays: 180,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
    ...overrides,
  });

describe('GetSkuRuleFactsUseCase', () => {
  it('returns rule-facing SKU facts without exposing domain entity', async () => {
    const skus = new FakeSkuRepository();
    skus.FindById.mockResolvedValue(Sku());

    const facts = await new GetSkuRuleFactsUseCase(skus).Execute('sku-1');

    expect(facts).toEqual({
      SkuId: 'sku-1',
      SkuCode: 'SKU-001',
      ItemClass: 'PHARMA',
      ItemStatus: SkuStatus.Blocked,
      DefaultOwnerId: 'owner-1',
      BaseUomId: 'uom-ea',
      InventoryUomId: 'uom-ea',
      LotControlled: true,
      ExpiryControlled: true,
      SerialControlled: true,
      OwnerControlled: true,
      LpnControlled: true,
      TemperatureControlled: true,
      DgControlled: true,
      CustomsControlled: true,
      QcRequired: true,
      TemperatureClass: 'CHILLED',
      DgClass: 'DG-3',
      BondedFlag: true,
      ShelfLifeDays: 365,
      MinRemainingShelfLifeDays: 180,
    });
    expect(facts).not.toBeInstanceOf(SkuEntity);
  });

  it('throws NotFoundException when SKU does not exist', async () => {
    const skus = new FakeSkuRepository();
    skus.FindById.mockResolvedValue(null);

    await expect(new GetSkuRuleFactsUseCase(skus).Execute('missing-sku')).rejects.toBeInstanceOf(NotFoundException);
  });
});
