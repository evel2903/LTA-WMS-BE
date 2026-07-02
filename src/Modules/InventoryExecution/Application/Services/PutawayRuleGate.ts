import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import {
  EvaluateRuleGate,
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
}
