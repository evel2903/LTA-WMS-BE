import { randomUUID } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { InboundRuleAttributeKeys } from '@modules/Inbound/Application/Services/InboundRuleGate';
import {
  PutawayRuleGate,
  PutawayRuleAttributeKeys,
} from '@modules/InventoryExecution/Application/Services/PutawayRuleGate';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import { InMemoryWarehouseRepository } from '@test/TestDoubles/MasterData/MasterDataTestDoubles';
import {
  BuildSeededPutawayRuleGate,
  MakePutawayDemoWarehouse,
} from '@test/TestDoubles/InventoryExecution/PutawayRuleGateTestDoubles';

class ThrowingRuleResolver implements IRuleResolver {
  public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
    void context;
    throw new Error('rule engine unavailable');
  }
}

describe('PutawayRuleGate (real RuleResolver, seeded WT-01 baseline — AC1/AC2/AC3/AC5)', () => {
  const buildGate = () => BuildSeededPutawayRuleGate();

  it('AC2: throws BusinessRuleException (ControlMode=HARD_BLOCK) when the winning rule is Compliance HardBlock (RULE-COM-COLD-01, cross-cut #6)', async () => {
    const { gate, profile } = await buildGate();

    let caught: unknown;
    try {
      await gate.Evaluate({
        WarehouseId: profile.WarehouseId,
        OwnerId: profile.OwnerId,
        Attributes: { [InboundRuleAttributeKeys.TempOutOfRange]: true },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      ControlMode: 'HARD_BLOCK',
      RuleCode: 'RULE-COM-COLD-01',
      ApprovalRequired: false,
    });
  });

  it('AC2: throws BusinessRuleException (ControlMode=APPROVAL_REQUIRED) and always blocks — reuses an existing baseline ApprovalRequired rule (RULE-QC-TRIG-01) since R-PUT has none yet', async () => {
    const { gate, profile } = await buildGate();

    let caught: unknown;
    try {
      await gate.Evaluate({
        WarehouseId: profile.WarehouseId,
        OwnerId: profile.OwnerId,
        Attributes: { [InboundRuleAttributeKeys.SupplierRisk]: 'high' },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      ControlMode: 'APPROVAL_REQUIRED',
      RuleCode: 'RULE-QC-TRIG-01',
      ApprovalRequired: true,
    });
  });

  it('AC2: does not throw and surfaces Suggestion when the winning rule is AutoSuggestion (RULE-PUT-ELIG-01)', async () => {
    const { gate, profile } = await buildGate();

    const outcome = await gate.Evaluate({
      WarehouseId: profile.WarehouseId,
      OwnerId: profile.OwnerId,
      Attributes: { [PutawayRuleAttributeKeys.CapacityAvailable]: true },
    });

    expect(outcome.Suggestion).toMatchObject({ RuleCode: 'RULE-PUT-ELIG-01' });
    expect(outcome.Warning).toBeUndefined();
  });

  it('AC2: returns a no-op outcome when the context is valid but no seeded rule condition matches (empty decision, Allowed=true)', async () => {
    const { gate, profile } = await buildGate();

    const outcome = await gate.Evaluate({
      WarehouseId: profile.WarehouseId,
      OwnerId: profile.OwnerId,
      Attributes: {},
    });

    expect(outcome).toEqual({});
  });

  it('AC1: returns a no-op outcome (does not call the resolver) when WarehouseId is null/undefined', async () => {
    const { gate } = await buildGate();

    expect(await gate.Evaluate({ WarehouseId: null })).toEqual({});
    expect(await gate.Evaluate({ WarehouseId: undefined })).toEqual({});
  });

  it('IRE-06 AC1: Evaluate() throws when WarehouseId does not resolve to a warehouse (bad/unknown id) — fail-closed, not a no-op outcome (was a no-op before IRE-06)', async () => {
    const { gate } = await buildGate();

    await expect(gate.Evaluate({ WarehouseId: randomUUID() })).rejects.toThrow(
      'Warehouse not found for putaway rule evaluation',
    );
  });

  it('AC5: propagates a resolver failure unchanged (fail-closed) — never swallowed into a no-op outcome', async () => {
    const warehouseId = randomUUID();
    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(MakePutawayDemoWarehouse(warehouseId));
    const gate = new PutawayRuleGate(new ThrowingRuleResolver(), warehouses);

    await expect(gate.Evaluate({ WarehouseId: warehouseId })).rejects.toThrow('rule engine unavailable');
  });

  it('IRE-06 AC1: Decide() throws when WarehouseId is set but does not resolve to a warehouse — fail-closed, not an empty decision', async () => {
    const { gate } = await buildGate();

    await expect(gate.Decide({ WarehouseId: randomUUID() })).rejects.toThrow(
      'Warehouse not found for putaway rule evaluation',
    );
  });

  it('IRE-06 AC1: Decide() still returns an empty decision (Matched=false) when WarehouseId itself is null/undefined — regression guard, distinct from "does not resolve"', async () => {
    const { gate } = await buildGate();

    expect(await gate.Decide({ WarehouseId: null })).toMatchObject({ Matched: false, Blocked: false });
    expect(await gate.Decide({ WarehouseId: undefined })).toMatchObject({ Matched: false, Blocked: false });
  });
});
