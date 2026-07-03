import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import {
  EvaluateRuleGate,
  ResolveRuleGate,
  RuleGateDecision,
  RuleGateInput,
  RuleGateOutcome,
} from '@modules/WarehouseProfile/Application/Services/RuleGateEvaluator';

/**
 * Attribute keys read by the Attributes bag of a RuleEvaluationContext, for rule conditions
 * authored against the directed-putaway decision point (§5 of the Epic 24 architecture addendum).
 * Values MUST byte-match the `Field` strings used in seeded RuleDefinitionEntity.ConditionJson
 * (InboundRuleBaselineSeed.ts) — a mismatch means a rule silently never matches (R2).
 *
 * Only keys actually read by an existing seeded rule are listed. Append-only when IRE-04 authors
 * new putaway rules that read new Attributes.
 */
export const PutawayRuleAttributeKeys = {
  /** #5 Directed putaway eligibility — RULE-PUT-ELIG-01 */
  CapacityAvailable: 'capacityAvailable',
  /**
   * #6 Compliance (cross-cut, IRE-05) — RULE-COM-COLD-01/RULE-COM-DG-01/RULE-COM-BONDED-01.
   * Same string values as InboundRuleAttributeKeys.TempOutOfRange where shared (RULE-COM-COLD-01
   * is cross-cutting) — declared locally per ADR-1 module boundary, not imported cross-module.
   */
  TempOutOfRange: 'tempOutOfRange',
  DgIncompatible: 'dgIncompatible',
  BondedMismatch: 'bondedMismatch',
} as const;

/** Scope axes + actor/object metadata + business Attributes a caller supplies to PutawayRuleGate.Evaluate. */
export type PutawayRuleGateInput = RuleGateInput;

/** Non-blocking signals surfaced to the caller when the winning rule does not block the transaction. */
export type PutawayRuleGateOutcome = RuleGateOutcome;

/**
 * Application-layer seam (ADR-1) between InventoryExecution putaway use cases and the
 * WarehouseProfile rule engine (IRuleResolver). This is the ONLY place in the InventoryExecution
 * module allowed to know about the rule engine — use cases call this gate, they never inject
 * RULE_RESOLVER directly. The context-build + resolve + decision-mapping logic itself lives in
 * the shared EvaluateRuleGate/ResolveRuleGate (WarehouseProfile module) so it can't drift between
 * InboundRuleGate and PutawayRuleGate — with ONE deliberate exception (IRE-06, see EnsureWarehouseResolvable):
 * this gate also evaluates Compliance hard-blocks (#5, RULE-COM-COLD/DG/BONDED-01), so it fails closed
 * on an unresolvable WarehouseId instead of the ADR-5 empty-decision fallback InboundRuleGate keeps.
 */
export class PutawayRuleGate {
  constructor(
    private readonly resolver: IRuleResolver,
    private readonly warehouses: IWarehouseRepository,
  ) {}

  public async Evaluate(input: PutawayRuleGateInput): Promise<PutawayRuleGateOutcome> {
    const warehouse = await this.EnsureWarehouseResolvable(input.WarehouseId);
    return EvaluateRuleGate(this.resolver, this.warehouses, input, warehouse);
  }

  /**
   * Non-throwing query variant: returns the resolved RuleGateDecision so a use case can map it into
   * its own return shape (e.g. per-candidate eligibility) instead of aborting. `Matched === false`
   * means an empty decision — the caller falls back to its previous hardcoded behavior (ADR-5
   * backward-compat). Resolver failures still propagate (R5 fail-closed).
   */
  public async Decide(input: PutawayRuleGateInput): Promise<RuleGateDecision> {
    const warehouse = await this.EnsureWarehouseResolvable(input.WarehouseId);
    return ResolveRuleGate(this.resolver, this.warehouses, input, warehouse);
  }

  /**
   * Fail-closed guard shared by Evaluate()/Decide() (IRE-06): a WarehouseId that's set but doesn't
   * resolve to a real warehouse (data-integrity gap — the column has no FK constraint) must not
   * silently read as "no requirement" the way ADR-5's EmptyDecision does for #1-#4 — it would bypass
   * a cold-chain/DG/bonded compliance check instead of blocking. Returns the resolved warehouse so
   * the caller can pass it straight into ResolveRuleGate/EvaluateRuleGate, avoiding a second
   * identical FindById for the same id.
   */
  private async EnsureWarehouseResolvable(
    warehouseId: string | null | undefined,
  ): Promise<WarehouseEntity | undefined> {
    if (!warehouseId) return undefined;
    const warehouse = await this.warehouses.FindById(warehouseId);
    if (!warehouse) {
      throw new BusinessRuleException('Warehouse not found for putaway rule evaluation', { WarehouseId: warehouseId });
    }
    return warehouse;
  }
}
