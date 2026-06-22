import {
  V1CoreFlowFixtureBuilder,
  V1_FORBIDDEN_INVENTORY_STATUS_MILESTONES,
} from '@modules/MasterData/Application/Services/V1CoreFlowFixtureBuilder';

describe('V1 core flow fixture builder', () => {
  it('creates WT-01, WT-05 and WT-06 fixtures with required V1 entry sections', () => {
    const fixtures = new V1CoreFlowFixtureBuilder().BuildAll();

    expect(fixtures.map((fixture) => fixture.WarehouseTypeCode)).toEqual(['WT-01', 'WT-05', 'WT-06']);
    for (const fixture of fixtures) {
      expect(fixture.Warehouse.WarehouseTypeCode).toBe(fixture.WarehouseTypeCode);
      expect(fixture.WarehouseProfile.WarehouseTypeCode).toBe(fixture.WarehouseTypeCode);
      expect(fixture.Owner.OwnerCode).toBeTruthy();
      expect(fixture.Sku.SkuCode).toBeTruthy();
      expect(fixture.Uoms.length).toBeGreaterThanOrEqual(2);
      expect(fixture.Barcodes.length).toBeGreaterThanOrEqual(1);
      expect(fixture.Partners.Supplier.ExternalReference).toBeTruthy();
      expect(fixture.Partners.Customer.ExternalReference).toBeTruthy();
      expect(fixture.Partners.Carrier.ExternalReference).toBeTruthy();
      expect(fixture.InboundSample.BusinessReference).toBeTruthy();
      expect(fixture.OutboundSample.BusinessReference).toBeTruthy();
      expect(fixture.ExpectedPath.InventoryStatuses).toContain('AVAILABLE');
      expect(fixture.ExpectedPath.WorkflowMilestones.length).toBeGreaterThan(0);
    }
  });

  it('keeps shipment/gate/goods-issue milestones out of InventoryStatus fixture paths', () => {
    const fixtures = new V1CoreFlowFixtureBuilder().BuildAll();

    for (const fixture of fixtures) {
      for (const forbidden of V1_FORBIDDEN_INVENTORY_STATUS_MILESTONES) {
        expect(fixture.ExpectedPath.InventoryStatuses).not.toContain(forbidden);
      }
      expect(fixture.ExpectedPath.ShipmentMilestones).toEqual(
        expect.arrayContaining(['SHIPMENT_CONFIRMED', 'GATE_OUT', 'GOODS_ISSUE_POSTED']),
      );
    }
  });

  it('does not share mutable expected-path arrays between fixtures or builds', () => {
    const builder = new V1CoreFlowFixtureBuilder();
    const fixtures = builder.BuildAll();
    fixtures[0].ExpectedPath.InventoryStatuses.push('GOODS_ISSUE_POSTED');

    expect(fixtures[1].ExpectedPath.InventoryStatuses).not.toContain('GOODS_ISSUE_POSTED');
    expect(builder.BuildAll()[0].ExpectedPath.InventoryStatuses).not.toContain('GOODS_ISSUE_POSTED');
  });
});
