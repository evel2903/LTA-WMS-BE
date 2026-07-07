import { BusinessRuleException, ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { OutboxMessageEntity } from '@modules/Integration/Domain/Entities/OutboxMessageEntity';
import {
  MakeInventoryBalance,
  MakeInventoryDimension,
  MakeInventoryStatus,
  MakeLocation,
  MakeSku,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
  MemoryLocationRepository,
  MemorySkuRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import { EntityManager } from 'typeorm';

const now = new Date('2026-06-23T05:00:00.000Z');
const contextFor = (actor: string): AuditContext => ({ ...SystemAuditContext, ActorUserId: actor });

class MemoryInventoryTransactionRepository implements IInventoryTransactionRepository {
  public transactions: InventoryTransactionEntity[] = [];
  public movements: InventoryMovementEntity[] = [];

  public async CreateTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    this.transactions.push(transaction);
    return transaction;
  }

  public async CreateMovement(movement: InventoryMovementEntity): Promise<InventoryMovementEntity> {
    this.movements.push(movement);
    return movement;
  }

  public async SaveTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    const index = this.transactions.findIndex((item) => item.Id === transaction.Id);
    if (index >= 0) {
      this.transactions[index] = transaction;
    } else {
      this.transactions.push(transaction);
    }
    return transaction;
  }

  public async FindTransactionByIdempotencyKey(
    putawayTaskId: string,
    idempotencyKey: string,
  ): Promise<InventoryTransactionEntity | null> {
    return (
      this.transactions.find(
        (transaction) => transaction.PutawayTaskId === putawayTaskId && transaction.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async FindTransactionByTypeAndIdempotencyKey(
    transactionType: InventoryTransactionType,
    idempotencyKey: string,
  ): Promise<InventoryTransactionEntity | null> {
    return (
      this.transactions.find(
        (transaction) =>
          transaction.PutawayTaskId === null &&
          transaction.TransactionType === transactionType &&
          transaction.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async FindMovementByTransactionId(transactionId: string): Promise<InventoryMovementEntity | null> {
    return this.movements.find((movement) => movement.InventoryTransactionId === transactionId) ?? null;
  }
}

class FakeIntegrationRepository {
  public outboxMessages: OutboxMessageEntity[] = [];

  public async CreateOutboxMessage(outboxMessage: OutboxMessageEntity): Promise<OutboxMessageEntity> {
    this.outboxMessages.push(outboxMessage);
    return outboxMessage;
  }
}

class FakeReasonCatalog implements IReasonCodeCatalog {
  public calls: Array<{ ReasonCode: string; Action: ActionCode; ObjectType: ObjectType }> = [];
  public Result = { ReasonCodeId: 'reason-default', EvidenceRequired: false, ApprovalRequired: false };

  public async ValidateReason(input: {
    ReasonCode: string;
    Action: ActionCode;
    ObjectType: ObjectType;
  }): Promise<{ ReasonCodeId: string; EvidenceRequired: boolean; ApprovalRequired: boolean }> {
    this.calls.push(input);
    return { ...this.Result, ReasonCodeId: `reason-${input.ReasonCode}` };
  }
}

class FakePermissionChecker implements IPermissionChecker {
  public calls: Array<{ Action: ActionCode; ObjectType: ObjectType; WarehouseId?: string | null }> = [];

  constructor(private readonly allowed: boolean = true) {}

  public async Check(context: {
    Action: ActionCode;
    ObjectType: ObjectType;
    Scope?: { WarehouseId?: string | null };
  }): Promise<PermissionDecision> {
    this.calls.push({
      Action: context.Action,
      ObjectType: context.ObjectType,
      WarehouseId: context.Scope?.WarehouseId,
    });
    return { Allowed: this.allowed };
  }
}

class FakeAuditedTransaction {
  public entries: AuditEntry[] = [];

  public async Run<T>(work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    const { result, entry } = await work({} as EntityManager);
    this.entries.push(entry);
    return result;
  }
}

function buildHarness(
  input: {
    statusCode?: string;
    sourceQty?: number;
    sourceReserved?: number;
    serialControlled?: boolean;
    permissionAllowed?: boolean;
  } = {},
) {
  const dimensionKeyService = new InventoryDimensionKeyService();
  const statuses = [
    MakeInventoryStatus({ Id: 'status-available', StatusCode: 'AVAILABLE', AllowsAllocation: true, AllowsPick: true }),
    MakeInventoryStatus({
      Id: 'status-hold',
      StatusCode: input.statusCode ?? 'HOLD',
      AllowsAllocation: false,
      AllowsPick: false,
    }),
    MakeInventoryStatus({
      Id: 'status-quarantine',
      StatusCode: 'QUARANTINE',
      AllowsAllocation: false,
      AllowsPick: false,
    }),
    MakeInventoryStatus({
      Id: 'status-ready-receiving',
      StatusCode: 'READY_FOR_RECEIVING',
      AllowsAllocation: false,
      AllowsPick: false,
      IsMilestone: true,
    }),
  ];
  const sourceStatus = statuses.find((status) => status.StatusCode === (input.statusCode ?? 'HOLD')) ?? statuses[1];
  const sourceHash = dimensionKeyService.BuildHash({
    OwnerId: 'owner-active',
    SkuId: 'sku-active',
    WarehouseId: 'warehouse-active',
    LocationId: 'loc-source',
    InventoryStatusId: sourceStatus.Id,
    UomId: 'uom-ea',
    LpnCode: 'LPN-001',
    LotNumber: 'LOT-001',
    SerialNumber: 'SER-001',
    CountryOfOrigin: 'VN',
    CustomsStatus: 'BONDED',
  });
  const sourceDimension = MakeInventoryDimension({
    Id: 'dimension-source',
    OwnerId: 'owner-active',
    SkuId: 'sku-active',
    WarehouseId: 'warehouse-active',
    LocationId: 'loc-source',
    InventoryStatusId: sourceStatus.Id,
    DimensionKeyHash: sourceHash,
    UomId: 'uom-ea',
    LpnCode: 'LPN-001',
    LotNumber: 'LOT-001',
    SerialNumber: 'SER-001',
    CountryOfOrigin: 'VN',
    CustomsStatus: 'BONDED',
    CreatedAt: now,
    UpdatedAt: now,
  });
  const balances = new MemoryInventoryBalanceRepository();
  balances.balances.set(
    'balance-source',
    MakeInventoryBalance({
      Id: 'balance-source',
      DimensionId: sourceDimension.Id,
      QtyOnHand: input.sourceQty ?? 10,
      QtyReserved: input.sourceReserved ?? 0,
    }),
  );
  const dimensions = new MemoryInventoryDimensionRepository();
  dimensions.dimensions.set(sourceDimension.Id, sourceDimension);
  const locations = new MemoryLocationRepository([
    MakeLocation({ Id: 'loc-source', LocationCode: 'A-01', WarehouseId: 'warehouse-active' }),
    MakeLocation({ Id: 'loc-target', LocationCode: 'B-01', WarehouseId: 'warehouse-active' }),
    MakeLocation({ Id: 'loc-other-wh', LocationCode: 'C-01', WarehouseId: 'warehouse-other' }),
  ]);
  const inventoryTransactions = new MemoryInventoryTransactionRepository();
  const integrations = new FakeIntegrationRepository();
  const reasonCatalog = new FakeReasonCatalog();
  const audited = new FakeAuditedTransaction();
  const permission = new FakePermissionChecker(input.permissionAllowed ?? true);
  const skus = new MemorySkuRepository([MakeSku({ SerialControlled: input.serialControlled ?? true })]);
  const useCase = new InventoryControlUseCase(
    inventoryTransactions,
    new MemoryInventoryStatusRepository(statuses),
    dimensions,
    balances,
    locations,
    integrations as unknown as IIntegrationRepository,
    dimensionKeyService,
    reasonCatalog,
    audited as unknown as AuditedTransaction,
    skus,
    permission,
  );

  return {
    useCase,
    balances,
    dimensions,
    inventoryTransactions,
    integrations,
    reasonCatalog,
    audited,
    permission,
    skus,
  };
}

describe('InventoryExecution inventory control use case', () => {
  it('changes HOLD inventory to AVAILABLE with reason, audit, event and identity preservation', async () => {
    const { useCase, balances, dimensions, integrations, audited, permission, reasonCatalog } = buildHarness();

    const result = await useCase.ChangeStatus(
      {
        SourceBalanceId: 'balance-source',
        TargetInventoryStatusCode: 'available',
        Quantity: 4,
        ReasonCode: 'inv_release',
        ReasonNote: 'Release sau QC',
        EvidenceRefs: ['qc://result-1'],
        IdempotencyKey: 'status-key-1',
      },
      contextFor('operator-1'),
    );

    const targetDimension = [...dimensions.dimensions.values()].find(
      (dimension) => dimension.Id === result.TargetBalance.DimensionId,
    );
    expect(result.EventType).toBe('InventoryStatusChanged');
    expect(result.InventoryTransaction.TransactionType).toBe(InventoryTransactionType.StatusChange);
    expect(result.InventoryTransaction.PutawayTaskId).toBeNull();
    expect(result.InventoryTransaction.FromInventoryStatusCode).toBe('HOLD');
    expect(result.InventoryTransaction.ToInventoryStatusCode).toBe('AVAILABLE');
    expect(result.SourceBalance.QtyOnHand).toBe(6);
    expect(result.TargetBalance.QtyOnHand).toBe(4);
    expect(targetDimension).toMatchObject({
      OwnerId: 'owner-active',
      SkuId: 'sku-active',
      WarehouseId: 'warehouse-active',
      LocationId: 'loc-source',
      UomId: 'uom-ea',
      LpnCode: 'LPN-001',
      LotNumber: 'LOT-001',
      SerialNumber: 'SER-001',
      CountryOfOrigin: 'VN',
      CustomsStatus: 'BONDED',
    });
    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(6);
    expect(integrations.outboxMessages[0]).toMatchObject({
      EventType: 'InventoryStatusChanged',
      Payload: expect.objectContaining({ ReasonCode: 'INV_RELEASE' }),
    });
    expect(reasonCatalog.calls[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.InventoryMovement,
      ReasonCode: 'INV_RELEASE',
    });
    expect(permission.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.InventoryMovement }),
        expect.objectContaining({ Action: ActionCode.Adjust, ObjectType: ObjectType.InventoryMovement }),
      ]),
    );
    expect(audited.entries[0]).toMatchObject({
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.InventoryMovement,
      Result: AuditResult.Success,
      ReasonCodeId: 'reason-INV_RELEASE',
    });
  });

  it('rejects release to AVAILABLE without reason and leaves balance unchanged', async () => {
    const { useCase, balances, inventoryTransactions, integrations, audited } = buildHarness();

    await expect(
      useCase.ChangeStatus(
        {
          SourceBalanceId: 'balance-source',
          TargetInventoryStatusCode: 'AVAILABLE',
          Quantity: 2,
          IdempotencyKey: 'status-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(10);
    expect(inventoryTransactions.transactions).toHaveLength(0);
    expect(integrations.outboxMessages).toHaveLength(0);
    expect(audited.entries[0]).toMatchObject({
      ObjectType: ObjectType.InventoryMovement,
      Result: AuditResult.Failed,
      AfterJson: expect.objectContaining({ Decision: 'Blocked' }),
    });
  });

  it('rejects workflow milestone target status without balance change', async () => {
    const { useCase, balances, inventoryTransactions, audited } = buildHarness();

    await expect(
      useCase.ChangeStatus(
        {
          SourceBalanceId: 'balance-source',
          TargetInventoryStatusCode: 'GATE_OUT',
          Quantity: 2,
          ReasonCode: 'INV_RELEASE',
          IdempotencyKey: 'status-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(10);
    expect(inventoryTransactions.transactions).toHaveLength(0);
    expect(audited.entries[0].AfterJson).toMatchObject({
      TargetInventoryStatusCode: 'GATE_OUT',
    });
  });

  it('rejects foundation statuses marked as workflow milestones', async () => {
    const { useCase, balances, inventoryTransactions, audited } = buildHarness();

    await expect(
      useCase.ChangeStatus(
        {
          SourceBalanceId: 'balance-source',
          TargetInventoryStatusCode: 'READY_FOR_RECEIVING',
          Quantity: 2,
          ReasonCode: 'INV_RELEASE',
          IdempotencyKey: 'status-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(10);
    expect(inventoryTransactions.transactions).toHaveLength(0);
    expect(audited.entries[0].AfterJson).toMatchObject({
      TargetInventoryStatusCode: 'READY_FOR_RECEIVING',
    });
  });

  it('moves AVAILABLE inventory internally within warehouse and keeps InventoryStatus unchanged', async () => {
    const { useCase, dimensions, integrations, reasonCatalog } = buildHarness({ statusCode: 'AVAILABLE' });

    const result = await useCase.MoveInternal(
      {
        SourceBalanceId: 'balance-source',
        TargetLocationId: 'loc-target',
        Quantity: 3,
        ReasonCode: 'internal_move',
        EvidenceRefs: ['move://work-1'],
        IdempotencyKey: 'move-key-1',
      },
      contextFor('operator-1'),
    );

    const targetDimension = [...dimensions.dimensions.values()].find(
      (dimension) => dimension.Id === result.TargetBalance.DimensionId,
    );
    expect(result.EventType).toBe('InventoryMoved');
    expect(result.InventoryTransaction.TransactionType).toBe(InventoryTransactionType.InternalMove);
    expect(result.InventoryTransaction.FromInventoryStatusCode).toBe('AVAILABLE');
    expect(result.InventoryTransaction.ToInventoryStatusCode).toBe('AVAILABLE');
    expect(result.InventoryMovement.ToLocationCode).toBe('B-01');
    expect(result.SourceBalance.QtyOnHand).toBe(7);
    expect(result.TargetBalance.QtyOnHand).toBe(3);
    expect(targetDimension).toMatchObject({
      LocationId: 'loc-target',
      LpnCode: 'LPN-001',
      LotNumber: 'LOT-001',
      SerialNumber: 'SER-001',
      CountryOfOrigin: 'VN',
      CustomsStatus: 'BONDED',
    });
    expect(integrations.outboxMessages[0].EventType).toBe('InventoryMoved');
    expect(reasonCatalog.calls[0]).toMatchObject({
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.InventoryMovement,
      ReasonCode: 'INTERNAL_MOVE',
    });
  });

  it('enforces evidence and approval decisions from the reason catalog', async () => {
    const missingEvidence = buildHarness({ statusCode: 'AVAILABLE' });
    missingEvidence.reasonCatalog.Result = {
      ReasonCodeId: 'reason-evidence',
      EvidenceRequired: true,
      ApprovalRequired: false,
    };

    await expect(
      missingEvidence.useCase.MoveInternal(
        {
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'loc-target',
          Quantity: 1,
          ReasonCode: 'RC-V1-ADJUSTMENT',
          IdempotencyKey: 'move-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(missingEvidence.inventoryTransactions.transactions).toHaveLength(0);
    expect(missingEvidence.balances.balances.get('balance-source')?.QtyOnHand).toBe(10);

    const approvalRequired = buildHarness({ statusCode: 'AVAILABLE' });
    approvalRequired.reasonCatalog.Result = {
      ReasonCodeId: 'reason-approval',
      EvidenceRequired: false,
      ApprovalRequired: true,
    };

    await expect(
      approvalRequired.useCase.MoveInternal(
        {
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'loc-target',
          Quantity: 1,
          ReasonCode: 'RC-V1-OVERRIDE',
          EvidenceRefs: ['approval://request-1'],
          IdempotencyKey: 'move-key-2',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(approvalRequired.inventoryTransactions.transactions).toHaveLength(0);
    expect(approvalRequired.balances.balances.get('balance-source')?.QtyOnHand).toBe(10);
  });

  it('rejects internal movement from COUNTING_LOCKED inventory', async () => {
    const { useCase, balances, inventoryTransactions, audited } = buildHarness({ statusCode: 'COUNTING_LOCKED' });

    await expect(
      useCase.MoveInternal(
        {
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'loc-target',
          Quantity: 1,
          ReasonCode: 'INTERNAL_MOVE',
          IdempotencyKey: 'move-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(10);
    expect(inventoryTransactions.transactions).toHaveLength(0);
    expect(audited.entries[0].AfterJson).toMatchObject({
      SourceInventoryStatusCode: 'COUNTING_LOCKED',
    });
  });

  it('rejects movement to another warehouse and negative available balance', async () => {
    const wrongWarehouse = buildHarness({ statusCode: 'AVAILABLE' });
    await expect(
      wrongWarehouse.useCase.MoveInternal(
        {
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'loc-other-wh',
          Quantity: 1,
          ReasonCode: 'INTERNAL_MOVE',
          IdempotencyKey: 'move-key-1',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const reserved = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 5, sourceReserved: 2 });
    await expect(
      reserved.useCase.MoveInternal(
        {
          SourceBalanceId: 'balance-source',
          TargetLocationId: 'loc-target',
          Quantity: 4,
          ReasonCode: 'INTERNAL_MOVE',
          IdempotencyKey: 'move-key-2',
        },
        contextFor('operator-1'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    expect(reserved.balances.balances.get('balance-source')?.QtyOnHand).toBe(5);
  });

  it('returns duplicate result for same idempotency payload and conflicts on changed payload', async () => {
    const { useCase, inventoryTransactions, integrations } = buildHarness();
    const request = {
      SourceBalanceId: 'balance-source',
      TargetInventoryStatusCode: 'AVAILABLE',
      Quantity: 2,
      ReasonCode: 'INV_RELEASE',
      IdempotencyKey: 'status-key-1',
    };

    const first = await useCase.ChangeStatus(request, contextFor('operator-1'));
    const second = await useCase.ChangeStatus(request, contextFor('operator-1'));

    expect(first.IsDuplicate).toBe(false);
    expect(second.IsDuplicate).toBe(true);
    expect(inventoryTransactions.transactions).toHaveLength(1);
    expect(integrations.outboxMessages).toHaveLength(1);
    await expect(useCase.ChangeStatus({ ...request, Quantity: 3 }, contextFor('operator-1'))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  describe('CorrectSerialNumber (IDC-09)', () => {
    it('corrects the serial number: zeroes the source balance, creates a new dimension/balance pair with the new serial, and audits it', async () => {
      const { useCase, balances, dimensions, integrations, audited, permission, reasonCatalog } = buildHarness({
        statusCode: 'AVAILABLE',
        sourceQty: 1,
      });

      const result = await useCase.CorrectSerialNumber(
        {
          SourceDimensionId: 'dimension-source',
          NewSerialNumber: 'SER-002',
          ReasonCode: 'rc-v1-adjustment',
          ReasonNote: 'Fixed a mis-scanned serial',
          EvidenceRefs: ['photo://label-1'],
          IdempotencyKey: 'serial-key-1',
        },
        contextFor('operator-1'),
      );

      const targetDimension = [...dimensions.dimensions.values()].find(
        (dimension) => dimension.Id === result.TargetBalance.DimensionId,
      );
      expect(result.EventType).toBe('InventorySerialCorrected');
      expect(result.SourceBalance.QtyOnHand).toBe(0);
      expect(result.TargetBalance.QtyOnHand).toBe(1);
      expect(targetDimension).toMatchObject({
        LocationId: 'loc-source',
        LotNumber: 'LOT-001',
        SerialNumber: 'SER-002',
        CountryOfOrigin: 'VN',
        CustomsStatus: 'BONDED',
      });
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(0);
      expect(integrations.outboxMessages[0].EventType).toBe('InventorySerialCorrected');
      expect(reasonCatalog.calls[0]).toMatchObject({
        Action: ActionCode.Adjust,
        ObjectType: ObjectType.InventoryMovement,
        ReasonCode: 'RC-V1-ADJUSTMENT',
      });
      expect(permission.calls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.InventoryMovement }),
          expect.objectContaining({ Action: ActionCode.Adjust, ObjectType: ObjectType.InventoryMovement }),
        ]),
      );
      expect(audited.entries[0]).toMatchObject({
        Action: ActionCode.Adjust,
        ObjectType: ObjectType.InventoryMovement,
        Result: AuditResult.Success,
      });
    });

    it('rejects when NewSerialNumber equals the current SerialNumber', async () => {
      const { useCase, balances } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1 });

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-001',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(BusinessRuleException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
    });

    it('rejects an empty NewSerialNumber', async () => {
      const { useCase } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1 });

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: '   ',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(BusinessRuleException);
    });

    it('rejects correcting a balance holding more than 1 unit — a serial must identify exactly one physical unit', async () => {
      const { useCase, balances } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 12 });

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(BusinessRuleException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(12);
    });

    it('rejects with 409 when the balance already has reserved (allocated) quantity — no separate allocation query needed', async () => {
      const { useCase, balances } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1, sourceReserved: 1 });

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
    });

    it('rejects a movable-status violation the same way MoveInternal does (e.g. COUNTING_LOCKED)', async () => {
      const { useCase, balances } = buildHarness({ statusCode: 'COUNTING_LOCKED', sourceQty: 1 });

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(BusinessRuleException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
    });

    it('rejects when NewSerialNumber already lives on another dimension with a non-zero balance (no unit-merge)', async () => {
      const { useCase, balances, dimensions } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1 });
      const dimensionKeyService = new InventoryDimensionKeyService();
      const otherHash = dimensionKeyService.BuildHash({
        OwnerId: 'owner-active',
        SkuId: 'sku-active',
        WarehouseId: 'warehouse-active',
        LocationId: 'loc-source',
        InventoryStatusId: 'status-available',
        UomId: 'uom-ea',
        LpnCode: 'LPN-001',
        LotNumber: 'LOT-001',
        SerialNumber: 'SER-002',
        CountryOfOrigin: 'VN',
        CustomsStatus: 'BONDED',
      });
      const otherDimension = MakeInventoryDimension({
        Id: 'dimension-other',
        OwnerId: 'owner-active',
        SkuId: 'sku-active',
        WarehouseId: 'warehouse-active',
        LocationId: 'loc-source',
        InventoryStatusId: 'status-available',
        DimensionKeyHash: otherHash,
        UomId: 'uom-ea',
        LpnCode: 'LPN-001',
        LotNumber: 'LOT-001',
        SerialNumber: 'SER-002',
        CountryOfOrigin: 'VN',
        CustomsStatus: 'BONDED',
      });
      dimensions.dimensions.set(otherDimension.Id, otherDimension);
      balances.balances.set(
        'balance-other',
        MakeInventoryBalance({ Id: 'balance-other', DimensionId: otherDimension.Id, QtyOnHand: 3, QtyReserved: 0 }),
      );

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
      expect(balances.balances.get('balance-other')?.QtyOnHand).toBe(3);
    });

    it('rejects a collision even when the other live dimension is in a DIFFERENT lot/location (SkuId+SerialNumber scoped, not full dimension hash) — caught via live-testing', async () => {
      const { useCase, balances, dimensions } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1 });
      const dimensionKeyService = new InventoryDimensionKeyService();
      const otherHash = dimensionKeyService.BuildHash({
        OwnerId: 'owner-active',
        SkuId: 'sku-active',
        WarehouseId: 'warehouse-active',
        LocationId: 'loc-target',
        InventoryStatusId: 'status-available',
        UomId: 'uom-ea',
        LpnCode: 'LPN-999',
        LotNumber: 'LOT-999',
        SerialNumber: 'SER-002',
        CountryOfOrigin: 'VN',
        CustomsStatus: 'BONDED',
      });
      const otherDimension = MakeInventoryDimension({
        Id: 'dimension-other-lot',
        OwnerId: 'owner-active',
        SkuId: 'sku-active',
        WarehouseId: 'warehouse-active',
        LocationId: 'loc-target',
        InventoryStatusId: 'status-available',
        DimensionKeyHash: otherHash,
        UomId: 'uom-ea',
        LpnCode: 'LPN-999',
        LotNumber: 'LOT-999',
        SerialNumber: 'SER-002',
        CountryOfOrigin: 'VN',
        CustomsStatus: 'BONDED',
      });
      dimensions.dimensions.set(otherDimension.Id, otherDimension);
      balances.balances.set(
        'balance-other-lot',
        MakeInventoryBalance({ Id: 'balance-other-lot', DimensionId: otherDimension.Id, QtyOnHand: 5, QtyReserved: 0 }),
      );

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
      expect(balances.balances.get('balance-other-lot')?.QtyOnHand).toBe(5);
    });

    it('allows correcting into a dimension that exists but has a zero balance (not a live collision)', async () => {
      const { useCase, balances, dimensions } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1 });
      const dimensionKeyService = new InventoryDimensionKeyService();
      const zombieHash = dimensionKeyService.BuildHash({
        OwnerId: 'owner-active',
        SkuId: 'sku-active',
        WarehouseId: 'warehouse-active',
        LocationId: 'loc-source',
        InventoryStatusId: 'status-available',
        UomId: 'uom-ea',
        LpnCode: 'LPN-001',
        LotNumber: 'LOT-001',
        SerialNumber: 'SER-002',
        CountryOfOrigin: 'VN',
        CustomsStatus: 'BONDED',
      });
      const zombieDimension = MakeInventoryDimension({
        Id: 'dimension-zombie',
        OwnerId: 'owner-active',
        SkuId: 'sku-active',
        WarehouseId: 'warehouse-active',
        LocationId: 'loc-source',
        InventoryStatusId: 'status-available',
        DimensionKeyHash: zombieHash,
        UomId: 'uom-ea',
        LpnCode: 'LPN-001',
        LotNumber: 'LOT-001',
        SerialNumber: 'SER-002',
        CountryOfOrigin: 'VN',
        CustomsStatus: 'BONDED',
      });
      dimensions.dimensions.set(zombieDimension.Id, zombieDimension);
      balances.balances.set(
        'balance-zombie',
        MakeInventoryBalance({ Id: 'balance-zombie', DimensionId: zombieDimension.Id, QtyOnHand: 0, QtyReserved: 0 }),
      );

      const result = await useCase.CorrectSerialNumber(
        {
          SourceDimensionId: 'dimension-source',
          NewSerialNumber: 'SER-002',
          ReasonCode: 'RC-V1-ADJUSTMENT',
          IdempotencyKey: 'serial-key-1',
        },
        contextFor('operator-1'),
      );

      expect(result.TargetBalance.DimensionId).toBe('dimension-zombie');
      expect(result.TargetBalance.QtyOnHand).toBe(1);
    });

    it('returns duplicate result for same idempotency payload and conflicts on a different NewSerialNumber', async () => {
      const { useCase, inventoryTransactions, integrations } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1 });
      const request = {
        SourceDimensionId: 'dimension-source',
        NewSerialNumber: 'SER-002',
        ReasonCode: 'RC-V1-ADJUSTMENT',
        IdempotencyKey: 'serial-key-1',
      };

      const first = await useCase.CorrectSerialNumber(request, contextFor('operator-1'));
      const second = await useCase.CorrectSerialNumber(request, contextFor('operator-1'));

      expect(first.IsDuplicate).toBe(false);
      expect(second.IsDuplicate).toBe(true);
      expect(inventoryTransactions.transactions).toHaveLength(1);
      expect(integrations.outboxMessages).toHaveLength(1);
      await expect(
        useCase.CorrectSerialNumber({ ...request, NewSerialNumber: 'SER-003' }, contextFor('operator-1')),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when the SKU is not serial-controlled, even if QtyOnHand happens to be 1', async () => {
      const { useCase, balances } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1, serialControlled: false });

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(BusinessRuleException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
    });

    it('rejects when the dimension references a SKU that no longer exists in the catalog', async () => {
      const { useCase, balances, skus } = buildHarness({ statusCode: 'AVAILABLE', sourceQty: 1 });
      skus.skus.delete('sku-active');

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(BusinessRuleException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
    });

    it('rejects when the caller lacks Adjust,InventoryMovement permission (Operator has no grant)', async () => {
      const { useCase, balances } = buildHarness({
        statusCode: 'AVAILABLE',
        sourceQty: 1,
        permissionAllowed: false,
      });

      await expect(
        useCase.CorrectSerialNumber(
          {
            SourceDimensionId: 'dimension-source',
            NewSerialNumber: 'SER-002',
            ReasonCode: 'RC-V1-ADJUSTMENT',
            IdempotencyKey: 'serial-key-1',
          },
          contextFor('operator-1'),
        ),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
      expect(balances.balances.get('balance-source')?.QtyOnHand).toBe(1);
    });
  });
});
