import { ReceivingOrmMapper } from '@modules/Inbound/Infrastructure/Mappers/ReceivingOrmMapper';
import { ReceiptLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptLineOrmEntity';
import { InboundPutawayReleaseOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPutawayReleaseOrmEntity';
import { PutawayTaskOrmMapper } from '@modules/InventoryExecution/Infrastructure/Mappers/PutawayTaskOrmMapper';
import { PutawayTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/PutawayTaskOrmEntity';

// TypeORM's postgres driver hydrates `type: 'date'` columns as raw 'YYYY-MM-DD' strings, not
// Date instances -- these tests build ORM rows the way pg actually returns them (ExpiryDate as a
// plain string), which the Fake-repository-based use-case tests never exercise (IDC-01 dual
// review, native workflow finding: confirmed by 3 independent verifiers).
describe('ORM -> Domain ExpiryDate mapping (IDC-01 regression: pg returns date columns as strings)', () => {
  const now = new Date('2026-07-05T00:00:00.000Z');

  it('ReceivingOrmMapper.ToLineDomain wraps a string ExpiryDate into a real Date', () => {
    const orm = {
      Id: 'line-1',
      ReceiptId: 'receipt-1',
      InboundPlanId: 'plan-1',
      InboundPlanLineId: 'plan-line-1',
      LineNumber: 1,
      SkuId: 'sku-1',
      SkuCode: 'SKU-1',
      UomId: 'uom-1',
      UomCode: 'EA',
      ExpectedQuantity: '10',
      ActualQuantity: '10',
      Status: 'Received',
      ManualConfirm: false,
      ReasonCode: null,
      ReasonCodeId: null,
      ReasonNote: null,
      ScanEvidenceJson: null,
      DiscrepancySignals: [],
      LotNumber: 'LOT-1',
      ExpiryDate: '2027-01-31',
      SerialNumber: 'SER-1',
      IdempotencyKey: 'key-1',
      ReceivedAt: now,
      ReceivedBy: 'user-1',
      CreatedAt: now,
      UpdatedAt: now,
    } as unknown as ReceiptLineOrmEntity;

    const domain = ReceivingOrmMapper.ToLineDomain(orm);

    expect(domain.ExpiryDate).toBeInstanceOf(Date);
    expect(domain.ExpiryDate?.toISOString().slice(0, 10)).toBe('2027-01-31');
    expect(() => domain.ExpiryDate?.getTime()).not.toThrow();
  });

  it('ReceivingOrmMapper.ToInboundPutawayReleaseDomain wraps a string ExpiryDate into a real Date', () => {
    const orm = {
      Id: 'release-1',
      InboundLpnId: null,
      ReceiptId: 'receipt-1',
      ReceiptLineId: 'line-1',
      InboundPlanId: 'plan-1',
      InboundPlanLineId: 'plan-line-1',
      OwnerId: 'owner-1',
      OwnerCode: 'OWNER-A',
      WarehouseId: 'warehouse-1',
      WarehouseCode: 'WH-A',
      SkuId: 'sku-1',
      SkuCode: 'SKU-1',
      UomId: 'uom-1',
      UomCode: 'EA',
      Quantity: '10',
      LpnCode: null,
      SsccCode: null,
      LotNumber: 'LOT-1',
      ExpiryDate: '2027-01-31',
      SerialNumber: 'SER-1',
      InventoryStatusCode: 'READY_FOR_PUTAWAY',
      CurrentLocationId: null,
      CurrentLocationCode: 'RECEIVING',
      WarehouseProfileId: null,
      LabelDecision: null,
      LabelReason: null,
      MatchedPrintJobId: null,
      ConstraintJson: null,
      RuleCode: null,
      OutboxMessageId: null,
      CoreFlowMilestoneId: null,
      ReasonCode: null,
      ReasonCodeId: null,
      ReasonNote: null,
      EvidenceRefs: [],
      IdempotencyKey: 'key-1',
      ReleasedAt: now,
      ReleasedBy: 'user-1',
      CreatedAt: now,
      UpdatedAt: now,
    } as unknown as InboundPutawayReleaseOrmEntity;

    const domain = ReceivingOrmMapper.ToInboundPutawayReleaseDomain(orm);

    expect(domain.ExpiryDate).toBeInstanceOf(Date);
    expect(domain.ExpiryDate?.toISOString().slice(0, 10)).toBe('2027-01-31');
    expect(() => domain.ExpiryDate?.getTime()).not.toThrow();
  });

  it('PutawayTaskOrmMapper.ToDomain wraps a string ExpiryDate into a real Date', () => {
    const orm = {
      Id: 'task-1',
      TaskCode: 'PUT-0001',
      TaskStatus: 'Released',
      InboundPutawayReleaseId: 'release-1',
      ReceiptId: 'receipt-1',
      ReceiptLineId: 'line-1',
      InboundPlanId: 'plan-1',
      InboundPlanLineId: 'plan-line-1',
      InboundLpnId: null,
      OwnerId: 'owner-1',
      OwnerCode: 'OWNER-A',
      WarehouseId: 'warehouse-1',
      WarehouseCode: 'WH-A',
      SkuId: 'sku-1',
      SkuCode: 'SKU-1',
      UomId: 'uom-1',
      UomCode: 'EA',
      Quantity: '10',
      LpnCode: null,
      SsccCode: null,
      LotNumber: 'LOT-1',
      ExpiryDate: '2027-01-31',
      SerialNumber: 'SER-1',
      InventoryStatusCode: 'READY_FOR_PUTAWAY',
      SourceLocationId: 'loc-source',
      SourceLocationCode: 'RCV-STG-01',
      TargetLocationId: 'loc-target',
      TargetLocationCode: 'A-01',
      TargetLocationProfileId: null,
      Priority: 50,
      WorkPoolCode: null,
      AssignedUserId: null,
      ConstraintJson: null,
      EligibilityDecisionJson: null,
      OutboxMessageId: null,
      MobileTaskId: null,
      ReasonCode: null,
      ReasonCodeId: null,
      ReasonNote: null,
      EvidenceRefs: [],
      IdempotencyKey: 'key-1',
      ReleasedAt: now,
      ReleasedBy: 'user-1',
      CreatedAt: now,
      UpdatedAt: now,
    } as unknown as PutawayTaskOrmEntity;

    const domain = PutawayTaskOrmMapper.ToDomain(orm);

    expect(domain.ExpiryDate).toBeInstanceOf(Date);
    expect(domain.ExpiryDate?.toISOString().slice(0, 10)).toBe('2027-01-31');
    expect(() => domain.ExpiryDate?.getTime()).not.toThrow();
  });
});
