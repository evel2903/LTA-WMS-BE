import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  V1CoreFlowFixtureBuilder,
  V1_FORBIDDEN_INVENTORY_STATUS_MILESTONES,
} from '@modules/MasterData/Application/Services/V1CoreFlowFixtureBuilder';

type EvidenceFile = {
  path: string;
  markers: string[];
  evidenceKind?: 'active-test' | 'source';
};

type AcceptanceEvidence = {
  acceptanceId: `AC-${string}`;
  warehouseTypes: string[];
  evidenceType: 'automated' | 'manual-plus-automated';
  manualEvidenceRefs?: string[];
  files: EvidenceFile[];
};

const ForbiddenInventoryStatusTerms = [
  ...V1_FORBIDDEN_INVENTORY_STATUS_MILESTONES,
  'RECONCILED',
  'INTEGRATION_SYNC_FAILED',
] as const;

const acceptanceEvidence: AcceptanceEvidence[] = [
  {
    acceptanceId: 'AC-01',
    warehouseTypes: ['WT-01'],
    evidenceType: 'automated',
    files: [
      {
        path: 'src/Modules/MasterData/Application/Services/V1CoreFlowFixtureBuilder.ts',
        evidenceKind: 'source',
        markers: ['WT-01', 'READY_FOR_PUTAWAY', 'AVAILABLE'],
      },
      {
        path: 'test/Modules/Inbound/Inbound.UseCasesSpec.ts',
        markers: [
          'dedupes duplicate source document by business key without a second plan',
          'releases READY_FOR_PUTAWAY receipt line to putaway with label validation, outbox and CoreFlow milestone',
        ],
      },
      {
        path: 'test/Modules/InventoryExecution/InventoryExecution.ConfirmUseCasesSpec.ts',
        markers: ['returns duplicate confirm result without posting a second transaction', 'READY_FOR_PUTAWAY'],
      },
      {
        path: 'test/Modules/Outbound/Outbound.AllocationUseCasesSpec.ts',
        markers: ['reserves eligible AVAILABLE inventory and writes audit/outbox/coreflow evidence'],
      },
      {
        path: 'test/Modules/Outbound/Outbound.PickTaskConfirmUseCasesSpec.ts',
        markers: ['confirms picked inventory from accepted mobile scans and completes both tasks'],
      },
      {
        path: 'test/Modules/Outbound/Outbound.PackingUseCasesSpec.ts',
        markers: ['creates, closes and marks a checked package ready for staging when label gate passes'],
      },
      {
        path: 'test/Modules/Shipping/Shipping.GoodsIssuePostingUseCasesSpec.ts',
        markers: ['posts Goods Issue once, deducts source balance, and queues owner-scoped events'],
      },
    ],
  },
  {
    acceptanceId: 'AC-02',
    warehouseTypes: ['WT-05'],
    evidenceType: 'automated',
    files: [
      {
        path: 'test/Modules/Outbound/Outbound.AllocationUseCasesSpec.ts',
        markers: ['does not reserve stock from another owner', 'allocate-owner-segregation'],
      },
      {
        path: 'test/Modules/Integration/Integration.UseCasesSpec.ts',
        markers: [
          'filters reconciliation source by WT-05 owner and creates mismatch item plus exception without outbox mutation',
          'WT-05-A',
          'OWNER-A',
        ],
      },
      {
        path: 'test/Modules/Shipping/Shipping.GoodsIssuePostingUseCasesSpec.ts',
        markers: [
          'blocks cross-owner Goods Issue posting by default',
          'blocks Goods Issue when owner context is missing',
        ],
      },
    ],
  },
  {
    acceptanceId: 'AC-03',
    warehouseTypes: ['WT-06'],
    evidenceType: 'manual-plus-automated',
    manualEvidenceRefs: [
      'Physical printer is explicitly out of V1 acceptance; automated evidence covers payload/template preview and print job lifecycle.',
      'Native mobile/offline scan queue is explicitly out of V1 acceptance; automated evidence covers responsive web/PWA task flows.',
    ],
    files: [
      {
        path: 'test/Modules/Outbound/Outbound.AllocationUseCasesSpec.ts',
        markers: ['records partial allocation and backorder with reason evidence', 'FullOnly policy has shortage'],
      },
      {
        path: 'test/Modules/Outbound/Outbound.PickTaskExceptionUseCasesSpec.ts',
        markers: ['records short pick exception, blocks the mobile task and links emergency replenishment'],
      },
      {
        path: 'test/Modules/BarcodeLabel/BarcodeLabel.UseCasesSpec.ts',
        markers: [
          'creates a preview print job from complete payload',
          'validates reason, increments reprint count and audits successful reprint',
        ],
      },
      {
        path: 'test/Modules/Shipping/Shipping.PackageStagingUseCasesSpec.ts',
        markers: ['waits for gate-out before Goods Issue trigger when WarehouseProfile config is at_gate_out'],
      },
    ],
  },
  {
    acceptanceId: 'AC-04',
    warehouseTypes: ['WT-01', 'WT-05', 'WT-06'],
    evidenceType: 'automated',
    files: [
      {
        path: 'test/Modules/Outbound/Outbound.AllocationUseCasesSpec.ts',
        markers: ['fails without reservation when only non-eligible stock is available', 'HOLD'],
      },
      {
        path: 'test/Modules/InventoryExecution/InventoryExecution.CycleCountUseCasesSpec.ts',
        markers: ['duplicate.IsDuplicate', 'PostAdjustment'],
      },
      {
        path: 'test/Modules/Shipping/Shipping.GoodsIssuePostingUseCasesSpec.ts',
        markers: [
          'returns duplicate Goods Issue result without double deduction',
          'InventoryTransactionType.GoodsIssue',
        ],
      },
    ],
  },
  {
    acceptanceId: 'AC-05',
    warehouseTypes: ['WT-01', 'WT-05', 'WT-06'],
    evidenceType: 'automated',
    files: [
      {
        path: 'test/Modules/Inbound/Inbound.UseCasesSpec.ts',
        markers: [
          'rejects discrepancy capture without reason or evidence and leaves no side effects',
          'denies discrepancy capture when Receipt update permission fails without side effects',
        ],
      },
      {
        path: 'test/Modules/BarcodeLabel/E2E.BarcodeLabelControllerSpec.ts',
        markers: ['guards print job routes with PrintJob permissions', 'ActionCode.Reprint'],
      },
      {
        path: 'test/Modules/Shipping/Shipping.GoodsIssuePostingUseCasesSpec.ts',
        markers: [
          'denies Goods Issue when GoodsIssue permission rejects actor',
          "ReferenceType: 'GoodsIssuePermission'",
        ],
      },
    ],
  },
  {
    acceptanceId: 'AC-06',
    warehouseTypes: ['WT-01', 'WT-05', 'WT-06'],
    evidenceType: 'automated',
    files: [
      {
        path: 'test/Modules/Integration/Integration.UseCasesSpec.ts',
        markers: [
          'acknowledges duplicate message without creating a second interface message or outbox event',
          'records direct outbox event with pending dispatch status and idempotent duplicate ack',
          'MissingOutboxMessage',
        ],
      },
      {
        path: 'test/Modules/Integration/E2E.IntegrationControllerSpec.ts',
        markers: ['reconciliation endpoints pass scoped filters and reason payload with ReconciliationRun permissions'],
      },
    ],
  },
  {
    acceptanceId: 'AC-07',
    warehouseTypes: ['WT-01', 'WT-05', 'WT-06'],
    evidenceType: 'automated',
    files: [
      {
        path: 'src/Shared/Database/TypeOrmDataSource.ts',
        evidenceKind: 'source',
        markers: [
          'IntegrationReconciliationRunOrmEntity',
          'IntegrationReconciliationItemOrmEntity',
          'ShipmentPackageStagingOrmEntity',
          'InventoryTransactionOrmEntity',
        ],
      },
      {
        path: 'test/Modules/MasterData/MasterData.InventoryStatusSeedSpec.ts',
        markers: ['ForbiddenNonInventoryStatusCodes'],
      },
    ],
  },
  {
    acceptanceId: 'AC-08',
    warehouseTypes: ['WT-01', 'WT-05', 'WT-06'],
    evidenceType: 'manual-plus-automated',
    manualEvidenceRefs: [
      'Physical printer, live ERP/OMS/TMS connector, native mobile app and offline scan queue are not acceptance prerequisites for V1.',
      'SLA/performance baseline is captured as support-surface risk in the evidence artifact; no runtime performance harness is introduced in V1-30.',
    ],
    files: [
      {
        path: 'test/Modules/WarehouseProfile/WarehouseProfile.GoodsIssueTriggerPolicySpec.ts',
        markers: ['at_loading', 'at_gate_out'],
      },
      {
        path: 'test/Modules/BarcodeLabel/BarcodeLabel.UseCasesSpec.ts',
        markers: ['creates a preview print job from complete payload', 'clamps list page sizes to max 100'],
      },
      {
        path: 'test/Modules/Integration/Integration.UseCasesSpec.ts',
        markers: ['DeadLetterActionType.ManualFix', 'clamps outbox/dead-letter list PageSize to 100'],
      },
    ],
  },
];

function readEvidenceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, 'utf8');
}

function hasActiveTestEvidence(content: string, marker: string): boolean {
  const markerIndexes: number[] = [];
  let markerIndex = content.indexOf(marker);
  while (markerIndex >= 0) {
    markerIndexes.push(markerIndex);
    markerIndex = content.indexOf(marker, markerIndex + marker.length);
  }
  if (markerIndexes.length === 0) return false;

  return markerIndexes.some((index) => {
    const beforeMarker = content.slice(0, index);
    const activeTestIndex = Math.max(
      beforeMarker.lastIndexOf("it('"),
      beforeMarker.lastIndexOf('it("'),
      beforeMarker.lastIndexOf('it(`'),
      beforeMarker.lastIndexOf("test('"),
      beforeMarker.lastIndexOf('test("'),
      beforeMarker.lastIndexOf('test(`'),
    );
    const skippedTestIndex = Math.max(
      beforeMarker.lastIndexOf('it.skip'),
      beforeMarker.lastIndexOf('test.skip'),
      beforeMarker.lastIndexOf('it.todo'),
      beforeMarker.lastIndexOf('test.todo'),
    );

    return activeTestIndex >= 0 && activeTestIndex > skippedTestIndex;
  });
}

describe('V1 MVP Core Flow acceptance pack', () => {
  it('locks WT-01, WT-05 and WT-06 fixture coverage with status/milestone separation', () => {
    const fixtures = new V1CoreFlowFixtureBuilder().BuildAll();

    expect(fixtures.map((fixture) => fixture.WarehouseTypeCode)).toEqual(['WT-01', 'WT-05', 'WT-06']);
    for (const fixture of fixtures) {
      expect(fixture.Warehouse.WarehouseTypeCode).toBe(fixture.WarehouseTypeCode);
      expect(fixture.WarehouseProfile.WarehouseTypeCode).toBe(fixture.WarehouseTypeCode);
      expect(fixture.InboundSample.BusinessReference).toMatch(/^INB-/);
      expect(fixture.OutboundSample.BusinessReference).toMatch(/^OUT-/);
      expect(fixture.ExpectedPath.InventoryStatuses).toEqual(
        expect.arrayContaining(['READY_FOR_PUTAWAY', 'AVAILABLE', 'ALLOCATED', 'PICKED', 'PACKED', 'LOADED']),
      );

      for (const forbidden of ForbiddenInventoryStatusTerms) {
        expect(fixture.ExpectedPath.InventoryStatuses).not.toContain(forbidden);
      }
      expect(fixture.ExpectedPath.ShipmentMilestones).toEqual(
        expect.arrayContaining(['SHIPMENT_CONFIRMED', 'GATE_OUT', 'GOODS_ISSUE_POSTED']),
      );
    }

    const wt06 = fixtures.find((fixture) => fixture.WarehouseTypeCode === 'WT-06');
    expect(wt06?.WarehouseProfile.StrategyPolicy.goodsIssueTrigger).toBe('at_gate_out');
  });

  it('covers every PRD acceptance criterion with executable code evidence', () => {
    expect(acceptanceEvidence.map((item) => item.acceptanceId)).toEqual([
      'AC-01',
      'AC-02',
      'AC-03',
      'AC-04',
      'AC-05',
      'AC-06',
      'AC-07',
      'AC-08',
    ]);

    for (const evidence of acceptanceEvidence) {
      expect(evidence.files.length).toBeGreaterThan(0);
      expect(evidence.warehouseTypes.length).toBeGreaterThan(0);
      if (evidence.evidenceType === 'manual-plus-automated') {
        expect(evidence.manualEvidenceRefs?.length).toBeGreaterThan(0);
      }
      for (const file of evidence.files) {
        const content = readEvidenceFile(file.path);
        for (const marker of file.markers) {
          if (file.evidenceKind === 'source') {
            expect(content).toContain(marker);
          } else {
            expect(hasActiveTestEvidence(content, marker)).toBe(true);
          }
        }
      }
    }
  });

  it('keeps forbidden shipment/gate/goods-issue and reconciliation states out of InventoryStatus seeds', () => {
    const inventoryStatusSeed = readEvidenceFile(
      'src/Shared/Database/Migrations/1781626000000-CreateInventoryStatusDimensionBalance.ts',
    );
    const inventoryStatusUpdateSpec = readEvidenceFile('test/Modules/MasterData/MasterData.InventoryStatusSeedSpec.ts');

    for (const forbidden of ForbiddenInventoryStatusTerms) {
      expect(inventoryStatusSeed).not.toContain(`'${forbidden}'`);
      expect(inventoryStatusSeed).not.toContain(`StatusCode: '${forbidden}'`);
      expect(inventoryStatusUpdateSpec).toContain(`'${forbidden}'`);
    }
  });
});
