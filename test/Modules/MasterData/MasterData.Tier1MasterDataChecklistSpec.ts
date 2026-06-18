import { Tier1MasterDataChecklistFixtureDto } from '@modules/MasterData/Application/DTOs/Tier1MasterDataChecklistDto';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { DefaultMasterDataOwnershipPolicies } from '@modules/MasterData/Application/Services/DefaultMasterDataOwnershipPolicies';
import { Tier1MasterDataChecklistService } from '@modules/MasterData/Application/Services/Tier1MasterDataChecklistService';
import { Tier1MasterDataFixtureBuilder } from '@modules/MasterData/Application/Services/Tier1MasterDataFixtureBuilder';
import { VerifyTier1MasterDataChecklistUseCase } from '@modules/MasterData/Application/UseCases/VerifyTier1MasterDataChecklistUseCase';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

class MemoryMasterDataOwnershipPolicyRepository implements IMasterDataOwnershipPolicyRepository {
  constructor(private readonly policies = DefaultMasterDataOwnershipPolicies()) {}

  public async List() {
    return this.policies;
  }

  public async FindByObjectGroup(objectGroup: MasterDataObjectGroup) {
    return this.policies.find((policy) => policy.ObjectGroup === objectGroup) ?? null;
  }
}

describe('Tier1 master data checklist verification', () => {
  it('passes A1-A5 fixture items and marks V0 dependencies as deferred with owner story', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(fixture);

    expect(result.HasFailures).toBe(false);
    expect(result.Items.filter((item) => item.Status === 'Fail')).toEqual([]);
    expect(result.Items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Code: 'MD-01', Status: 'Pass' }),
        expect.objectContaining({ Code: 'MD-02', Status: 'Pass' }),
        expect.objectContaining({ Code: 'MD-04', Status: 'Pass' }),
        expect.objectContaining({ Code: 'MD-05', Status: 'Pass' }),
        expect.objectContaining({ Code: 'MD-08', Status: 'Pass' }),
        expect.objectContaining({ Code: 'MD-11', Status: 'Deferred', DeferredToStory: 'C3' }),
        expect.objectContaining({ Code: 'MD-13', Status: 'Deferred', DeferredToStory: 'C4/C5' }),
        expect.objectContaining({ Code: 'MD-10', Status: 'Deferred', DeferredToStory: 'V1+' }),
        expect.objectContaining({ Code: 'MD-WP', Status: 'Deferred', DeferredToStory: 'Epic B/B7' }),
        expect.objectContaining({ Code: 'MD-OPS', Status: 'Deferred', DeferredToStory: 'V1+' }),
      ]),
    );
    const warehouseLocationItem = result.Items.find((item) => item.Code === 'MD-04');
    expect(`${warehouseLocationItem?.Message} ${warehouseLocationItem?.Evidence.join(' ')}`).toContain('CanXacMinh');
  });

  it('fails when an FR-8 ownership policy row is missing', async () => {
    const policies = DefaultMasterDataOwnershipPolicies().filter(
      (policy) => policy.ObjectGroup !== MasterDataObjectGroup.ReasonCode,
    );
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(policies),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(fixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-OWNERSHIP',
        Status: 'Fail',
        Message: expect.stringContaining('ReasonCode'),
      }),
    );
  });

  it('fails when an FR-8 ownership policy row has invalid semantic values', async () => {
    const policies = DefaultMasterDataOwnershipPolicies().map((policy) =>
      policy.ObjectGroup === MasterDataObjectGroup.Sku
        ? { ...policy, DirectEditAllowed: true, RequiresReason: false, DeferredToStory: null }
        : policy,
    );
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(policies),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(fixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-OWNERSHIP',
        Status: 'Fail',
        Message: expect.stringContaining('Sku'),
      }),
    );
  });

  it('fails when required source trace fields are missing from fixture data', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const brokenFixture: Tier1MasterDataChecklistFixtureDto = {
      ...fixture,
      Sku: { ...fixture.Sku, SourceSystem: null },
    };
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(brokenFixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-SOURCE',
        Status: 'Fail',
        Message: expect.stringContaining('Sku'),
      }),
    );
  });

  it('fails when active locations do not have a location profile', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const brokenFixture: Tier1MasterDataChecklistFixtureDto = {
      ...fixture,
      Locations: [{ ...fixture.Locations[0], LocationProfileId: '', LocationStatus: LocationStatus.Active }],
    };
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(brokenFixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-05',
        Status: 'Fail',
      }),
    );
  });

  it('fails when pack, barcode and UOM conversion graph is inactive or inconsistent', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const brokenFixture: Tier1MasterDataChecklistFixtureDto = {
      ...fixture,
      PackDefinition: {
        ...fixture.PackDefinition,
        Status: MasterDataStatus.Inactive,
      },
      SkuBarcode: {
        ...fixture.SkuBarcode,
        PackCode: 'UNKNOWN-PACK',
      },
      UomConversion: {
        ...fixture.UomConversion,
        Factor: 0,
      },
    };
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(brokenFixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-02',
        Status: 'Fail',
      }),
    );
  });

  it('fails when the Tier 1 location tree does not form a same-zone three-level parent chain', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const brokenFixture: Tier1MasterDataChecklistFixtureDto = {
      ...fixture,
      Locations: [
        fixture.Locations[0],
        { ...fixture.Locations[1], ParentLocationId: null },
        { ...fixture.Locations[2], ZoneId: 'other-zone' },
      ],
    };
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(brokenFixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-04',
        Status: 'Fail',
      }),
    );
  });

  it('fails when active SKU does not reference the fixture owner and active UOMs', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const brokenFixture: Tier1MasterDataChecklistFixtureDto = {
      ...fixture,
      Sku: {
        ...fixture.Sku,
        DefaultOwnerId: 'other-owner',
        BaseUomId: 'other-base-uom',
      },
    };
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(brokenFixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-01',
        Status: 'Fail',
      }),
    );
  });

  it('fails when item coverage misses default order setting values', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const brokenFixture: Tier1MasterDataChecklistFixtureDto = {
      ...fixture,
      ItemCoverage: {
        ...fixture.ItemCoverage,
        StandardQty: null,
        MultipleQty: null,
        LeadTimeDays: null,
        DefaultReceiveWarehouseId: null,
      },
    };
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(brokenFixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-16',
        Status: 'Fail',
      }),
    );
  });

  it('fails when inventory balance availability is inconsistent', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const brokenFixture: Tier1MasterDataChecklistFixtureDto = {
      ...fixture,
      InventoryBalance: { ...fixture.InventoryBalance, QtyAvailable: 99 },
    };
    const useCase = new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    );

    const result = await useCase.Execute(brokenFixture);

    expect(result.HasFailures).toBe(true);
    expect(result.Items).toContainEqual(
      expect.objectContaining({
        Code: 'MD-INV-BALANCE',
        Status: 'Fail',
      }),
    );
  });
});
