import {
  Tier1MasterDataChecklistDto,
  Tier1MasterDataChecklistFixtureDto,
  Tier1MasterDataChecklistItemDto,
} from '@modules/MasterData/Application/DTOs/Tier1MasterDataChecklistDto';
import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';
import { DataOwnershipMode } from '@modules/MasterData/Domain/Enums/DataOwnershipMode';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { OwnershipPolicyImplementationStatus } from '@modules/MasterData/Domain/Enums/OwnershipPolicyImplementationStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { SourceOfTruthType } from '@modules/MasterData/Domain/Enums/SourceOfTruthType';
import { Tier1ChecklistItemStatus } from '@modules/MasterData/Domain/Enums/Tier1ChecklistItemStatus';

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

type SourceTraceable = {
  SourceSystem: string | null;
  ReferenceId: string | null;
};

type RequiredOwnershipPolicySemantic = {
  SourceOfTruthType: SourceOfTruthType;
  OwnershipMode: DataOwnershipMode;
  DirectEditAllowed: boolean;
  RequiresAudit: boolean;
  RequiresReason: boolean;
  RequiresSourceSystem: boolean;
  RequiresReferenceId: boolean;
  ImplementationStatus: OwnershipPolicyImplementationStatus;
  DeferredToStory: string | null;
};

const requiredPolicySemantics: Record<MasterDataObjectGroup, RequiredOwnershipPolicySemantic> = {
  [MasterDataObjectGroup.Sku]: {
    SourceOfTruthType: SourceOfTruthType.Wms,
    OwnershipMode: DataOwnershipMode.WmsOwnedEditable,
    DirectEditAllowed: true,
    RequiresAudit: true,
    RequiresReason: false,
    RequiresSourceSystem: false,
    RequiresReferenceId: false,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Implemented,
    DeferredToStory: 'FND-UXR-03A',
  },
  [MasterDataObjectGroup.UomPack]: {
    SourceOfTruthType: SourceOfTruthType.Hybrid,
    OwnershipMode: DataOwnershipMode.ExternalImportedConditionalEdit,
    DirectEditAllowed: true,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: true,
    RequiresReferenceId: true,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Implemented,
    DeferredToStory: 'C5',
  },
  [MasterDataObjectGroup.BarcodeAlias]: {
    SourceOfTruthType: SourceOfTruthType.Hybrid,
    OwnershipMode: DataOwnershipMode.ExternalImportedConditionalEdit,
    DirectEditAllowed: true,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: true,
    RequiresReferenceId: true,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Implemented,
    DeferredToStory: 'C5',
  },
  [MasterDataObjectGroup.WarehouseLocation]: {
    SourceOfTruthType: SourceOfTruthType.Wms,
    OwnershipMode: DataOwnershipMode.WmsOwnedEditable,
    DirectEditAllowed: true,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: false,
    RequiresReferenceId: false,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Implemented,
    DeferredToStory: 'C5',
  },
  [MasterDataObjectGroup.LocationProfile]: {
    SourceOfTruthType: SourceOfTruthType.Wms,
    OwnershipMode: DataOwnershipMode.WmsOwnedControlled,
    DirectEditAllowed: true,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: false,
    RequiresReferenceId: false,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Implemented,
    DeferredToStory: 'C5',
  },
  [MasterDataObjectGroup.OwnerCustomerSupplier]: {
    SourceOfTruthType: SourceOfTruthType.ExternalSystem,
    OwnershipMode: DataOwnershipMode.ExternalOwnedReadOnly,
    DirectEditAllowed: false,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: true,
    RequiresReferenceId: true,
    ImplementationStatus: OwnershipPolicyImplementationStatus.PartiallyImplemented,
    DeferredToStory: 'C5',
  },
  [MasterDataObjectGroup.InventoryStatus]: {
    SourceOfTruthType: SourceOfTruthType.Wms,
    OwnershipMode: DataOwnershipMode.WmsOwnedControlled,
    DirectEditAllowed: true,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: false,
    RequiresReferenceId: false,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Implemented,
    DeferredToStory: 'C5',
  },
  [MasterDataObjectGroup.LpnSscc]: {
    SourceOfTruthType: SourceOfTruthType.Deferred,
    OwnershipMode: DataOwnershipMode.Deferred,
    DirectEditAllowed: false,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: true,
    RequiresReferenceId: true,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Deferred,
    DeferredToStory: 'V1+',
  },
  [MasterDataObjectGroup.ReasonCode]: {
    SourceOfTruthType: SourceOfTruthType.Wms,
    OwnershipMode: DataOwnershipMode.Deferred,
    DirectEditAllowed: false,
    RequiresAudit: true,
    RequiresReason: false,
    RequiresSourceSystem: false,
    RequiresReferenceId: false,
    ImplementationStatus: OwnershipPolicyImplementationStatus.Deferred,
    DeferredToStory: 'C3',
  },
};

export class Tier1MasterDataChecklistService {
  public Verify(
    policies: MasterDataOwnershipPolicyEntity[],
    fixture: Tier1MasterDataChecklistFixtureDto,
  ): Tier1MasterDataChecklistDto {
    const items: Tier1MasterDataChecklistItemDto[] = [];
    items.push(this.VerifyOwnershipPolicies(policies));
    items.push(this.VerifySourceFields(fixture));
    items.push(this.VerifyMinimumMasterData(fixture));
    items.push(this.VerifyPackBarcodeConversion(fixture));
    items.push(this.VerifyWarehouseLocationTree(fixture));
    items.push(this.VerifyLocationProfiles(fixture));
    items.push(this.VerifyInventoryStatus(fixture));
    items.push(this.VerifyItemCoverage(fixture));
    items.push(this.VerifyInventoryBalance(fixture));
    items.push(this.Deferred('MD-10', 'LPN/SSCC master lifecycle is not part of A6.', 'V1+'));
    items.push(this.Deferred('MD-11', 'Reason Code catalog is completed by C3.', 'C3'));
    items.push(this.Deferred('MD-13', 'Immutable before/after audit is completed by C4/C5.', 'C4/C5'));
    items.push(this.Deferred('MD-WP', 'Warehouse Profile checklist belongs to Epic B/B7.', 'Epic B/B7'));
    items.push(this.Deferred('MD-OPS', 'Inbound/outbound/transfer/returns are outside V0/A6.', 'V1+'));

    return {
      Items: items,
      HasFailures: items.some((item) => item.Status === Tier1ChecklistItemStatus.Fail),
    };
  }

  private VerifyOwnershipPolicies(policies: MasterDataOwnershipPolicyEntity[]): Tier1MasterDataChecklistItemDto {
    const policiesByObjectGroup = new Map(policies.map((policy) => [policy.ObjectGroup, policy]));
    const missing = requiredObjectGroups.filter((objectGroup) => !policiesByObjectGroup.has(objectGroup));
    if (missing.length > 0) {
      return this.Fail('MD-OWNERSHIP', `Missing ownership policy rows: ${missing.join(', ')}`, []);
    }

    const weakPolicies = policies.filter(
      (policy) =>
        !policy.SourceOfTruthType ||
        !policy.OwnershipMode ||
        !policy.ImplementationStatus ||
        !policy.SourceDocRef ||
        policy.TypicalSourceSystems.length === 0,
    );

    if (weakPolicies.length > 0) {
      return this.Fail(
        'MD-OWNERSHIP',
        `Ownership policies missing required metadata: ${weakPolicies.map((policy) => policy.ObjectGroup).join(', ')}`,
        [],
      );
    }

    const invalidSemantics = requiredObjectGroups.filter((objectGroup) => {
      const policy = policiesByObjectGroup.get(objectGroup);
      return policy ? !this.HasExpectedPolicySemantics(policy, requiredPolicySemantics[objectGroup]) : false;
    });

    if (invalidSemantics.length > 0) {
      return this.Fail(
        'MD-OWNERSHIP',
        `Ownership policies have invalid semantics: ${invalidSemantics.join(', ')}`,
        invalidSemantics,
      );
    }

    return this.Pass('MD-OWNERSHIP', 'FR-8 ownership policy matrix has all required object groups.', [
      ...requiredObjectGroups,
    ]);
  }

  private VerifySourceFields(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    const rows: Array<[string, SourceTraceable]> = [
      ['Site', fixture.Site],
      ['Warehouse', fixture.Warehouse],
      ['Zone', fixture.Zone],
      ['LocationProfile', fixture.LocationProfile],
      ...fixture.Locations.map((location, index): [string, SourceTraceable] => [`Location${index + 1}`, location]),
      ['Owner', fixture.Owner],
      ...fixture.Uoms.map((uom, index): [string, SourceTraceable] => [`Uom${index + 1}`, uom]),
      ['Sku', fixture.Sku],
      ['PackDefinition', fixture.PackDefinition],
      ['SkuBarcode', fixture.SkuBarcode],
      ['UomConversion', fixture.UomConversion],
      ['ItemCoverage', fixture.ItemCoverage],
      ['InventoryStatus', fixture.InventoryStatus],
      ['InventoryDimension', fixture.InventoryDimension],
      ['InventoryBalance', fixture.InventoryBalance],
    ];
    const missing = rows
      .filter(([, row]) => !this.HasText(row.SourceSystem) || !this.HasText(row.ReferenceId))
      .map(([name]) => name);

    if (missing.length > 0) {
      return this.Fail('MD-SOURCE', `Missing source trace fields for: ${missing.join(', ')}`, missing);
    }

    return this.Pass(
      'MD-SOURCE',
      'All Tier 1 fixture rows have SourceSystem and ReferenceId.',
      rows.map(([name]) => name),
    );
  }

  private VerifyMinimumMasterData(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    const activeUomIds = this.ActiveUomIds(fixture);
    const controlFlagsReadable = [
      fixture.Sku.LotControlled,
      fixture.Sku.ExpiryControlled,
      fixture.Sku.SerialControlled,
      fixture.Sku.OwnerControlled,
      fixture.Sku.LpnControlled,
      fixture.Sku.TemperatureControlled,
      fixture.Sku.DgControlled,
      fixture.Sku.CustomsControlled,
      fixture.Sku.QcRequired,
      fixture.Sku.BondedFlag,
    ].every((flag) => typeof flag === 'boolean');
    const valid =
      fixture.Owner.Status === MasterDataStatus.Active &&
      fixture.Uoms.length >= 2 &&
      fixture.Uoms.every((uom) => uom.Status === MasterDataStatus.Active) &&
      fixture.Sku.ItemStatus === SkuStatus.Active &&
      fixture.Sku.DefaultOwnerId === fixture.Owner.Id &&
      activeUomIds.has(fixture.Sku.BaseUomId) &&
      activeUomIds.has(fixture.Sku.InventoryUomId) &&
      this.HasText(fixture.Sku.ItemClass) &&
      fixture.SkuBarcode.Status === MasterDataStatus.Active &&
      fixture.InventoryStatus.Status === MasterDataStatus.Active &&
      controlFlagsReadable;

    if (!valid) {
      return this.Fail('MD-01', 'SKU, owner, UOM, barcode and inventory status are not all active and complete.', []);
    }

    return this.Pass('MD-01', 'SKU, owner, UOM, barcode and inventory status are available.', [
      fixture.Sku.SkuCode,
      fixture.Owner.OwnerCode,
      fixture.InventoryStatus.StatusCode,
    ]);
  }

  private VerifyPackBarcodeConversion(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    const activeUomIds = this.ActiveUomIds(fixture);
    const packValid =
      fixture.PackDefinition.Status === MasterDataStatus.Active &&
      fixture.PackDefinition.SkuId === fixture.Sku.Id &&
      activeUomIds.has(fixture.PackDefinition.UomId) &&
      this.HasText(fixture.PackDefinition.PackCode) &&
      fixture.PackDefinition.QuantityPerPack > 0;
    const barcodeValid =
      fixture.SkuBarcode.Status === MasterDataStatus.Active &&
      fixture.SkuBarcode.SkuId === fixture.Sku.Id &&
      fixture.SkuBarcode.UomId === fixture.PackDefinition.UomId &&
      fixture.SkuBarcode.PackCode === fixture.PackDefinition.PackCode &&
      this.HasText(fixture.SkuBarcode.BarcodeValue);
    const conversionValid =
      fixture.UomConversion.Status === MasterDataStatus.Active &&
      fixture.UomConversion.SkuId === fixture.Sku.Id &&
      activeUomIds.has(fixture.UomConversion.FromUomId) &&
      activeUomIds.has(fixture.UomConversion.ToUomId) &&
      fixture.UomConversion.FromUomId !== fixture.UomConversion.ToUomId &&
      fixture.UomConversion.Factor > 0;

    if (!packValid || !barcodeValid || !conversionValid) {
      return this.Fail(
        'MD-02',
        'Pack definition, barcode and UOM conversion must be active and consistent for the Tier 1 SKU.',
        [],
      );
    }

    return this.Pass('MD-02', 'Pack definition, barcode and UOM conversion are consistent for the Tier 1 SKU.', [
      fixture.PackDefinition.PackCode,
      fixture.SkuBarcode.BarcodeValue,
      fixture.UomConversion.Id,
    ]);
  }

  private VerifyWarehouseLocationTree(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    const activeLocations = fixture.Locations.filter((location) => location.LocationStatus === LocationStatus.Active);
    const locationsById = new Map(fixture.Locations.map((location) => [location.Id, location]));
    const allLocationsInScope = activeLocations.every(
      (location) =>
        location.WarehouseId === fixture.Warehouse.Id &&
        location.ZoneId === fixture.Zone.Id &&
        location.LocationProfileId === fixture.LocationProfile.Id,
    );
    const hasThreeLevelChain = activeLocations.some((leaf) => {
      const parentLocationId = leaf.ParentLocationId;
      if (typeof parentLocationId !== 'string' || parentLocationId.trim().length === 0) {
        return false;
      }
      const parent = locationsById.get(parentLocationId);
      const rootLocationId = parent?.ParentLocationId;
      if (!parent || typeof rootLocationId !== 'string' || rootLocationId.trim().length === 0) {
        return false;
      }
      const root = locationsById.get(rootLocationId);
      if (!root || this.HasText(root.ParentLocationId)) {
        return false;
      }

      return [root, parent, leaf].every(
        (location) =>
          location.LocationStatus === LocationStatus.Active &&
          location.WarehouseId === fixture.Warehouse.Id &&
          location.ZoneId === fixture.Zone.Id &&
          location.LocationProfileId === fixture.LocationProfile.Id,
      );
    });
    const valid =
      fixture.Site.Status === MasterDataStatus.Active &&
      fixture.Warehouse.Status === MasterDataStatus.Active &&
      fixture.Warehouse.SiteId === fixture.Site.Id &&
      fixture.Zone.Status === MasterDataStatus.Active &&
      fixture.Zone.WarehouseId === fixture.Warehouse.Id &&
      activeLocations.length >= 3 &&
      allLocationsInScope &&
      hasThreeLevelChain;

    if (!valid) {
      return this.Fail('MD-04', 'Site, warehouse, zone and 3-level location tree are incomplete.', []);
    }

    return this.Pass(
      'MD-04',
      'Site -> Warehouse -> Zone -> Location tree is complete for Tier 1. CanXacMinh: WT-01 is used for Tier 1 pending final warehouse type confirmation.',
      [
        fixture.Site.SiteCode,
        fixture.Warehouse.WarehouseCode,
        `CanXacMinh:${fixture.Warehouse.WarehouseTypeCode}`,
        fixture.Zone.ZoneCode,
      ],
    );
  }

  private VerifyLocationProfiles(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    const missingProfile = fixture.Locations.filter(
      (location) =>
        location.LocationStatus === LocationStatus.Active && location.LocationProfileId !== fixture.LocationProfile.Id,
    );

    if (fixture.LocationProfile.Status !== MasterDataStatus.Active || missingProfile.length > 0) {
      return this.Fail('MD-05', 'Every active location must have an active location profile.', [
        ...missingProfile.map((location) => location.LocationCode),
      ]);
    }

    return this.Pass('MD-05', 'Every active location has a location profile.', [
      fixture.LocationProfile.ProfileCode,
      ...fixture.Locations.map((location) => location.LocationCode),
    ]);
  }

  private VerifyInventoryStatus(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    if (
      fixture.InventoryStatus.StatusCode !== 'AVAILABLE' ||
      !fixture.InventoryStatus.AllowsAllocation ||
      !fixture.InventoryStatus.AllowsPick
    ) {
      return this.Fail('MD-08', 'AVAILABLE inventory status must allow allocation and pick.', [
        fixture.InventoryStatus.StatusCode,
      ]);
    }

    return this.Pass('MD-08', 'AVAILABLE inventory status allows allocation and pick.', [
      fixture.InventoryStatus.StatusCode,
    ]);
  }

  private VerifyItemCoverage(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    const defaultOrderSettingsValid =
      this.IsPositiveNumber(fixture.ItemCoverage.StandardQty) &&
      this.IsPositiveNumber(fixture.ItemCoverage.MultipleQty) &&
      this.IsNonNegativeNumber(fixture.ItemCoverage.LeadTimeDays) &&
      fixture.ItemCoverage.DefaultReceiveWarehouseId === fixture.Warehouse.Id &&
      fixture.ItemCoverage.DefaultShipWarehouseId === fixture.Warehouse.Id &&
      typeof fixture.ItemCoverage.StopReceiving === 'boolean' &&
      typeof fixture.ItemCoverage.StopShipping === 'boolean';
    const valid =
      fixture.ItemCoverage.Status === MasterDataStatus.Active &&
      fixture.ItemCoverage.SkuId === fixture.Sku.Id &&
      fixture.ItemCoverage.WarehouseId === fixture.Warehouse.Id &&
      fixture.ItemCoverage.OwnerId === fixture.Owner.Id &&
      defaultOrderSettingsValid;

    if (!valid) {
      return this.Fail('MD-16', 'Item coverage/default order setting is missing for SKU + warehouse + owner.', []);
    }

    return this.Pass('MD-16', 'Item coverage/default order setting exists for SKU + warehouse + owner.', [
      fixture.ItemCoverage.Id,
    ]);
  }

  private VerifyInventoryBalance(fixture: Tier1MasterDataChecklistFixtureDto): Tier1MasterDataChecklistItemDto {
    const dimensionValid =
      fixture.InventoryDimension.OwnerId === fixture.Owner.Id &&
      fixture.InventoryDimension.SkuId === fixture.Sku.Id &&
      fixture.InventoryDimension.WarehouseId === fixture.Warehouse.Id &&
      fixture.InventoryDimension.LocationId === fixture.Locations[2]?.Id &&
      fixture.InventoryDimension.InventoryStatusId === fixture.InventoryStatus.Id;
    const balanceValid =
      fixture.InventoryBalance.DimensionId === fixture.InventoryDimension.Id &&
      fixture.InventoryBalance.QtyAvailable ===
        fixture.InventoryBalance.QtyOnHand - fixture.InventoryBalance.QtyReserved;

    if (!dimensionValid || !balanceValid) {
      return this.Fail('MD-INV-BALANCE', 'Inventory dimension/balance is missing or quantity invariant failed.', []);
    }

    return this.Pass('MD-INV-BALANCE', 'Inventory dimension and balance satisfy A5 quantity invariant.', [
      fixture.InventoryDimension.Id,
      fixture.InventoryBalance.Id,
    ]);
  }

  private Pass(code: string, message: string, evidence: string[]): Tier1MasterDataChecklistItemDto {
    return {
      Code: code,
      Status: Tier1ChecklistItemStatus.Pass,
      Message: message,
      Evidence: evidence,
      DeferredToStory: null,
    };
  }

  private Fail(code: string, message: string, evidence: string[]): Tier1MasterDataChecklistItemDto {
    return {
      Code: code,
      Status: Tier1ChecklistItemStatus.Fail,
      Message: message,
      Evidence: evidence,
      DeferredToStory: null,
    };
  }

  private Deferred(code: string, message: string, deferredToStory: string): Tier1MasterDataChecklistItemDto {
    return {
      Code: code,
      Status: Tier1ChecklistItemStatus.Deferred,
      Message: message,
      Evidence: [],
      DeferredToStory: deferredToStory,
    };
  }

  private HasText(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private HasExpectedPolicySemantics(
    policy: MasterDataOwnershipPolicyEntity,
    expected: RequiredOwnershipPolicySemantic,
  ): boolean {
    return (
      policy.SourceOfTruthType === expected.SourceOfTruthType &&
      policy.OwnershipMode === expected.OwnershipMode &&
      policy.DirectEditAllowed === expected.DirectEditAllowed &&
      policy.RequiresAudit === expected.RequiresAudit &&
      policy.RequiresReason === expected.RequiresReason &&
      policy.RequiresSourceSystem === expected.RequiresSourceSystem &&
      policy.RequiresReferenceId === expected.RequiresReferenceId &&
      policy.ImplementationStatus === expected.ImplementationStatus &&
      policy.DeferredToStory === expected.DeferredToStory
    );
  }

  private IsPositiveNumber(value: number | null): boolean {
    return typeof value === 'number' && value > 0;
  }

  private IsNonNegativeNumber(value: number | null): boolean {
    return typeof value === 'number' && value >= 0;
  }

  private ActiveUomIds(fixture: Tier1MasterDataChecklistFixtureDto): Set<string> {
    return new Set(fixture.Uoms.filter((uom) => uom.Status === MasterDataStatus.Active).map((uom) => uom.Id));
  }
}
