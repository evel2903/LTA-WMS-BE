import { MasterDataOwnershipPolicyDto } from '@modules/MasterData/Application/DTOs/MasterDataOwnershipPolicyDto';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { DefaultMasterDataOwnershipPolicies } from '@modules/MasterData/Application/Services/DefaultMasterDataOwnershipPolicies';
import { ListMasterDataOwnershipPoliciesUseCase } from '@modules/MasterData/Application/UseCases/ListMasterDataOwnershipPoliciesUseCase';
import { DataOwnershipMode } from '@modules/MasterData/Domain/Enums/DataOwnershipMode';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { OwnershipPolicyImplementationStatus } from '@modules/MasterData/Domain/Enums/OwnershipPolicyImplementationStatus';
import { SourceOfTruthType } from '@modules/MasterData/Domain/Enums/SourceOfTruthType';
import { CreateMasterDataOwnershipPolicy1781627000000 } from '@shared/Database/Migrations/1781627000000-CreateMasterDataOwnershipPolicy';

class MemoryMasterDataOwnershipPolicyRepository implements IMasterDataOwnershipPolicyRepository {
  constructor(private readonly policies: MasterDataOwnershipPolicyDto[]) {}

  public async List(): Promise<MasterDataOwnershipPolicyDto[]> {
    return this.policies;
  }

  public async FindByObjectGroup(objectGroup: MasterDataObjectGroup): Promise<MasterDataOwnershipPolicyDto | null> {
    return this.policies.find((policy) => policy.ObjectGroup === objectGroup) ?? null;
  }
}

const makePolicy = (overrides: Partial<MasterDataOwnershipPolicyDto> = {}): MasterDataOwnershipPolicyDto => ({
  Id: `policy-${overrides.ObjectGroup ?? MasterDataObjectGroup.Sku}`,
  ObjectGroup: MasterDataObjectGroup.Sku,
  DisplayName: 'SKU',
  SourceOfTruthType: SourceOfTruthType.ExternalSystem,
  TypicalSourceSystems: ['ERP', 'OMS', 'PIM', 'OwnerMaster'],
  OwnershipMode: DataOwnershipMode.ExternalOwnedReadOnly,
  DirectEditAllowed: false,
  RequiresAudit: true,
  RequiresReason: true,
  RequiresSourceSystem: true,
  RequiresReferenceId: true,
  ImplementationStatus: OwnershipPolicyImplementationStatus.PartiallyImplemented,
  DeferredToStory: 'C5',
  PolicyNotes: 'SKU basic attributes are external-owned by default.',
  SourceDocRef: 'doc04#14',
  CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
  UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  CreatedBy: null,
  UpdatedBy: null,
  ...overrides,
});

const requiredObjectGroups = [
  MasterDataObjectGroup.Sku,
  MasterDataObjectGroup.UomPack,
  MasterDataObjectGroup.BarcodeAlias,
  MasterDataObjectGroup.WarehouseLocation,
  MasterDataObjectGroup.LocationProfile,
  MasterDataObjectGroup.OwnerCustomerSupplier,
  MasterDataObjectGroup.InventoryStatus,
  MasterDataObjectGroup.LpnSscc,
  MasterDataObjectGroup.ReasonCode,
];

describe('MasterData ownership policy catalog', () => {
  it('lists all FR-8 source-of-truth object groups with policy fields', async () => {
    const policies = requiredObjectGroups.map((objectGroup) =>
      makePolicy({
        Id: `policy-${objectGroup}`,
        ObjectGroup: objectGroup,
        DisplayName: objectGroup,
        ImplementationStatus:
          objectGroup === MasterDataObjectGroup.LpnSscc || objectGroup === MasterDataObjectGroup.ReasonCode
            ? OwnershipPolicyImplementationStatus.Deferred
            : OwnershipPolicyImplementationStatus.Implemented,
      }),
    );
    const useCase = new ListMasterDataOwnershipPoliciesUseCase(new MemoryMasterDataOwnershipPolicyRepository(policies));

    const result = await useCase.Execute();

    expect(result.Items.map((policy) => policy.ObjectGroup)).toEqual(requiredObjectGroups);
    expect(result.TotalItems).toBe(9);
    for (const policy of result.Items) {
      expect(policy.SourceOfTruthType).toBeDefined();
      expect(policy.TypicalSourceSystems.length).toBeGreaterThan(0);
      expect(policy.OwnershipMode).toBeDefined();
      expect(typeof policy.DirectEditAllowed).toBe('boolean');
      expect(typeof policy.RequiresAudit).toBe('boolean');
      expect(typeof policy.RequiresReason).toBe('boolean');
      expect(typeof policy.RequiresSourceSystem).toBe('boolean');
      expect(typeof policy.RequiresReferenceId).toBe('boolean');
      expect(policy.ImplementationStatus).toBeDefined();
      expect(policy.SourceDocRef).toBe('doc04#14');
    }
  });

  it('captures doc 04 ownership semantics for editable, external-owned and deferred groups', async () => {
    const policies = DefaultMasterDataOwnershipPolicies();
    const useCase = new ListMasterDataOwnershipPoliciesUseCase(new MemoryMasterDataOwnershipPolicyRepository(policies));

    const result = await useCase.Execute();
    const byGroup = new Map(result.Items.map((policy) => [policy.ObjectGroup, policy]));

    expect(byGroup.get(MasterDataObjectGroup.Sku)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Wms,
      OwnershipMode: DataOwnershipMode.WmsOwnedEditable,
      DirectEditAllowed: true,
      RequiresAudit: true,
      RequiresReason: false,
      RequiresSourceSystem: false,
      RequiresReferenceId: false,
      ImplementationStatus: OwnershipPolicyImplementationStatus.Implemented,
      DeferredToStory: 'FND-UXR-03A',
    });
    expect(byGroup.get(MasterDataObjectGroup.OwnerCustomerSupplier)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.ExternalSystem,
      OwnershipMode: DataOwnershipMode.ExternalOwnedReadOnly,
      DirectEditAllowed: false,
      RequiresSourceSystem: true,
      RequiresReferenceId: true,
      ImplementationStatus: OwnershipPolicyImplementationStatus.PartiallyImplemented,
      DeferredToStory: 'C5',
    });
    expect(byGroup.get(MasterDataObjectGroup.WarehouseLocation)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Wms,
      OwnershipMode: DataOwnershipMode.WmsOwnedEditable,
      DirectEditAllowed: true,
      RequiresAudit: true,
      RequiresReason: true,
    });
    expect(byGroup.get(MasterDataObjectGroup.LocationProfile)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Wms,
      OwnershipMode: DataOwnershipMode.WmsOwnedControlled,
      DirectEditAllowed: true,
      RequiresAudit: true,
      RequiresReason: true,
      DeferredToStory: 'C5',
    });
    expect(byGroup.get(MasterDataObjectGroup.UomPack)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Hybrid,
      OwnershipMode: DataOwnershipMode.ExternalImportedConditionalEdit,
      DirectEditAllowed: true,
      RequiresAudit: true,
      RequiresReason: true,
    });
    expect(byGroup.get(MasterDataObjectGroup.BarcodeAlias)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Hybrid,
      OwnershipMode: DataOwnershipMode.ExternalImportedConditionalEdit,
      DirectEditAllowed: true,
      RequiresAudit: true,
      RequiresReason: true,
    });
    expect(byGroup.get(MasterDataObjectGroup.InventoryStatus)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Wms,
      OwnershipMode: DataOwnershipMode.WmsOwnedControlled,
      DirectEditAllowed: true,
      RequiresAudit: true,
      RequiresReason: true,
    });
    expect(byGroup.get(MasterDataObjectGroup.LpnSscc)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Deferred,
      OwnershipMode: DataOwnershipMode.Deferred,
      DirectEditAllowed: false,
      RequiresAudit: true,
      RequiresReason: true,
      ImplementationStatus: OwnershipPolicyImplementationStatus.Deferred,
      DeferredToStory: 'V1+',
    });
    expect(byGroup.get(MasterDataObjectGroup.ReasonCode)).toMatchObject({
      SourceOfTruthType: SourceOfTruthType.Wms,
      OwnershipMode: DataOwnershipMode.Deferred,
      DirectEditAllowed: false,
      RequiresAudit: true,
      RequiresReason: false,
      ImplementationStatus: OwnershipPolicyImplementationStatus.Deferred,
      DeferredToStory: 'C3',
    });
  });

  it('provides a migration for ownership policy table and seeded FR-8 rows', async () => {
    const migration = new CreateMasterDataOwnershipPolicy1781627000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join('\n').toLowerCase();
    expect(sql).toContain('create table "master_data_ownership_policies"');
    expect(sql).toContain('unique ("object_group")');
    expect(sql).toContain('typical_source_systems');
    expect(sql).toContain('requires_source_system');
    expect(sql).toContain('requires_reference_id');
    for (const objectGroup of requiredObjectGroups) {
      expect(sql).toContain(objectGroup.toLowerCase());
    }
  });
});
