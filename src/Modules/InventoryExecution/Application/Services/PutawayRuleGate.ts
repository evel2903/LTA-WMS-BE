import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
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
 * the shared EvaluateRuleGate (WarehouseProfile module) so it can't drift between InboundRuleGate
 * and PutawayRuleGate.
 */
export class PutawayRuleGate {
  constructor(
    private readonly resolver: IRuleResolver,
    private readonly warehouses: IWarehouseRepository,
  ) {}

  public async Evaluate(input: PutawayRuleGateInput): Promise<PutawayRuleGateOutcome> {
    return EvaluateRuleGate(this.resolver, this.warehouses, input);
  }

  /**
   * Non-throwing query variant: returns the resolved RuleGateDecision so a use case can map it into
   * its own return shape (e.g. per-candidate eligibility) instead of aborting. `Matched === false`
   * means an empty decision — the caller falls back to its previous hardcoded behavior (ADR-5
   * backward-compat). Resolver failures still propagate (R5 fail-closed).
   *
   * Diverges from InboundRuleGate.Decide() on ONE failure mode: an unresolvable WarehouseId (the id
   * is set but doesn't resolve to a real warehouse — a data-integrity gap, not "no WarehouseId
   * given"). The shared ResolveRuleGate treats that as an empty decision (correct ADR-5 backward-compat
   * for #1-#4, which are non-safety). This gate also evaluates Compliance hard-blocks (#5,
   * RULE-COM-COLD/DG/BONDED-01) — silently falling through there would bypass a cold-chain/DG/bonded
   * check instead of blocking, so this gate fails closed instead (IRE-06).
   */
  public async Decide(input: PutawayRuleGateInput): Promise<RuleGateDecision> {
    if (input.WarehouseId) {
      const warehouse = await this.warehouses.FindById(input.WarehouseId);
      if (!warehouse) {
        throw new BusinessRuleException('Warehouse not found for putaway rule evaluation', {
          WarehouseId: input.WarehouseId,
        });
      }
    }
    return ResolveRuleGate(this.resolver, this.warehouses, input);
  }
}
