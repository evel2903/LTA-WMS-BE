import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { UpdateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/UpdateWarehouseProfileUseCase';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import {
  InMemoryWarehouseProfileRepository,
  MasterDataReferenceStub,
} from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';

const Build = () => {
  const profiles = new InMemoryWarehouseProfileRepository();
  const refs = new MasterDataReferenceStub();
  const create = new CreateWarehouseProfileUseCase(
    profiles,
    refs.Warehouses,
    refs.Zones,
    refs.Owners,
    refs.Skus,
    new ScopeKeyService(),
    new WarehouseProfilePolicyValidator(),
  );
  const update = new UpdateWarehouseProfileUseCase(
    profiles,
    refs.Warehouses,
    refs.Zones,
    refs.Owners,
    refs.Skus,
    new ScopeKeyService(),
    new WarehouseProfilePolicyValidator(),
  );
  return { profiles, refs, create, update };
};

const ValidInput = () => ({
  ProfileCode: 'WP-1',
  ProfileName: 'Profile 1',
  WarehouseTypeCode: 'TIER_1',
  EffectiveFrom: '2026-01-01',
});

describe('Warehouse profile validation', () => {
  it('rejects an empty WarehouseTypeCode with BusinessRuleException', async () => {
    const { create } = Build();
    await expect(create.Execute({ ...ValidInput(), WarehouseTypeCode: '   ' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('rejects EffectiveTo <= EffectiveFrom with BusinessRuleException', async () => {
    const { create } = Build();
    await expect(
      create.Execute({ ...ValidInput(), EffectiveFrom: '2026-02-01', EffectiveTo: '2026-01-01' }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('accepts EffectiveTo strictly greater than EffectiveFrom', async () => {
    const { create } = Build();
    const created = await create.Execute({ ...ValidInput(), EffectiveFrom: '2026-01-01', EffectiveTo: '2026-12-31' });
    expect(created.EffectiveTo).toBe('2026-12-31');
  });

  it('rejects a non-existent WarehouseId scope reference with NotFoundException', async () => {
    const { create } = Build();
    await expect(create.Execute({ ...ValidInput(), WarehouseId: 'missing-warehouse' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects an inactive WarehouseId scope reference with BusinessRuleException', async () => {
    const { create, refs } = Build();
    refs.AddWarehouse('warehouse-inactive', MasterDataStatus.Inactive);
    await expect(create.Execute({ ...ValidInput(), WarehouseId: 'warehouse-inactive' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('rejects an inactive OwnerId scope reference with BusinessRuleException', async () => {
    const { create, refs } = Build();
    refs.AddOwner('owner-inactive', MasterDataStatus.Inactive);
    await expect(create.Execute({ ...ValidInput(), OwnerId: 'owner-inactive' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('accepts active warehouse/zone/owner/sku scope references', async () => {
    const { create, refs } = Build();
    refs.AddWarehouse('warehouse-1', MasterDataStatus.Active);
    refs.AddZone('zone-1', MasterDataStatus.Active);
    refs.AddOwner('owner-1', MasterDataStatus.Active);
    refs.AddSku('sku-1', true);

    const created = await create.Execute({
      ...ValidInput(),
      WarehouseId: 'warehouse-1',
      ZoneId: 'zone-1',
      OwnerId: 'owner-1',
      SkuId: 'sku-1',
    });

    expect(created.WarehouseId).toBe('warehouse-1');
    expect(created.OwnerId).toBe('owner-1');
  });

  it('rejects a malformed config policy shape with BusinessRuleException', async () => {
    const { create } = Build();
    await expect(
      create.Execute({
        ...ValidInput(),
        CapabilityFlags: ['not', 'an', 'object'] as unknown as Record<string, unknown>,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('accepts well-formed object config policies and persists them', async () => {
    const { create } = Build();
    const created = await create.Execute({
      ...ValidInput(),
      CapabilityFlags: { Putaway: true },
      StrategyPolicy: { PutawayStrategy: 'DIRECTED' },
    });
    expect(created.CapabilityFlags).toEqual({ Putaway: true });
    expect(created.StrategyPolicy).toEqual({ PutawayStrategy: 'DIRECTED' });
  });

  it('PATCH rejects null for a business-required field (ProfileName)', async () => {
    const { create, update } = Build();
    const created = await create.Execute(ValidInput());
    await expect(update.Execute({ Id: created.Id, ProfileName: null as unknown as string })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('PATCH rejects null for WarehouseTypeCode', async () => {
    const { create, update } = Build();
    const created = await create.Execute(ValidInput());
    await expect(
      update.Execute({ Id: created.Id, WarehouseTypeCode: null as unknown as string }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('PATCH leaves an omitted field unchanged and recomputes ScopeKey when scope changes', async () => {
    const { create, update, refs } = Build();
    refs.AddWarehouse('warehouse-1', MasterDataStatus.Active);
    const created = await create.Execute(ValidInput());

    const updated = await update.Execute({ Id: created.Id, WarehouseId: 'warehouse-1' });

    expect(updated.ProfileName).toBe('Profile 1');
    expect(updated.WarehouseId).toBe('warehouse-1');
    expect(updated.ScopeKey).toBe(
      new ScopeKeyService().Build({ WarehouseTypeCode: 'TIER_1', WarehouseId: 'warehouse-1' }),
    );
  });

  it('PATCH on a missing profile throws NotFoundException', async () => {
    const { update } = Build();
    await expect(update.Execute({ Id: 'missing', ProfileName: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('enforces minimum scope readiness (WarehouseTypeCode) on create through the use case', async () => {
    const { create } = Build();
    // A blank WarehouseTypeCode means the profile has no required scope axis -> readiness rejected.
    await expect(create.Execute({ ...ValidInput(), WarehouseTypeCode: '  ' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('enforces minimum scope readiness (WarehouseTypeCode) on update through the use case', async () => {
    const { create, update } = Build();
    const created = await create.Execute(ValidInput());
    // Spy proves the readiness gate is exercised on the real update path (not dead code).
    const readinessSpy = jest.spyOn(WarehouseProfilePolicyValidator.prototype, 'AssertScopeReadiness');
    await update.Execute({ Id: created.Id, ProfileName: 'Renamed' });
    expect(readinessSpy).toHaveBeenCalledWith(expect.objectContaining({ WarehouseTypeCode: 'TIER_1' }));
    readinessSpy.mockRestore();
  });

  it('validator readiness rejects a blank required scope axis (WarehouseTypeCode)', () => {
    const validator = new WarehouseProfilePolicyValidator();
    expect(() => validator.AssertScopeReadiness({ WarehouseTypeCode: '' })).toThrow(BusinessRuleException);
    expect(() => validator.AssertScopeReadiness({ WarehouseTypeCode: 'TIER_1' })).not.toThrow();
  });
});
