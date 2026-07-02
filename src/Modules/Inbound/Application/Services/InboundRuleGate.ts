import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import {
  EvaluateRuleGate,
  RuleGateInput,
  RuleGateOutcome,
} from '@modules/WarehouseProfile/Application/Services/RuleGateEvaluator';

/**
 * Attribute keys read by the Attributes bag of a RuleEvaluationContext, for rule conditions
 * authored against the Inbound decision points (§5 of the Epic 24 architecture addendum). Values
 * MUST byte-match the `Field` strings used in seeded RuleDefinitionEntity.ConditionJson
 * (InboundRuleBaselineSeed.ts) — a mismatch means a rule silently never matches (R2).
 *
 * Only keys actually read by an existing seeded rule are listed. Append-only when IRE-02..05
 * author new rules that read new Attributes; do not rename or remove existing keys without
 * updating every rule definition that references them.
 */
export const InboundRuleAttributeKeys = {
  /** #1 Gate-in readiness — RULE-IN-GATE-01 */
  HasAppointment: 'hasAppointment',
  /** #2 Over/under receiving tolerance — RULE-IN-TOL-01 */
  OverUnderPct: 'overUnderPct',
  /** #3 QC trigger — RULE-QC-TRIG-01 */
  SupplierRisk: 'supplierRisk',
  /** #4 LPN required — RULE-LPN-REQ-01 */
  LpnControlled: 'lpnControlled',
  HasLpn: 'hasLpn',
  /** #6 Compliance cold-chain (cross-cut) — RULE-COM-COLD-01 */
  TempOutOfRange: 'tempOutOfRange',
} as const;

/** Scope axes + actor/object metadata + business Attributes a caller supplies to InboundRuleGate.Evaluate. */
export type InboundRuleGateInput = RuleGateInput;

/** Non-blocking signals surfaced to the caller when the winning rule does not block the transaction. */
export type InboundRuleGateOutcome = RuleGateOutcome;

/**
 * Application-layer seam (ADR-1) between Inbound use cases and the WarehouseProfile rule engine
 * (IRuleResolver). This is the ONLY place in the Inbound module allowed to know about the rule
 * engine — use cases call this gate, they never inject RULE_RESOLVER directly. The context-build
 * + resolve + decision-mapping logic itself lives in the shared EvaluateRuleGate (WarehouseProfile
 * module) so it can't drift between InboundRuleGate and PutawayRuleGate.
 */
export class InboundRuleGate {
  constructor(
    private readonly resolver: IRuleResolver,
    private readonly warehouses: IWarehouseRepository,
  ) {}

  public async Evaluate(input: InboundRuleGateInput): Promise<InboundRuleGateOutcome> {
    return EvaluateRuleGate(this.resolver, this.warehouses, input);
  }
}
