import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

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
export interface PutawayRuleGateInput {
  WarehouseId: string | null | undefined;
  OwnerId?: string | null;
  ZoneId?: string | null;
  LocationType?: string | null;
  SkuId?: string | null;
  ItemClass?: string | null;
  OrderType?: string | null;
  CustomerId?: string | null;
  SupplierId?: string | null;
  ActorUserId?: string | null;
  Action?: string | null;
  ObjectType?: string | null;
  ObjectId?: string | null;
  ReasonCode?: string | null;
  Attributes?: Record<string, unknown>;
}

/** Non-blocking signals surfaced to the caller when the winning rule does not block the transaction. */
export interface PutawayRuleGateOutcome {
  Warning?: { Message: string; RuleCode: string };
  Suggestion?: { Message: string; RuleCode: string };
}

/**
 * Application-layer seam (ADR-1) between InventoryExecution putaway use cases and the
 * WarehouseProfile rule engine (IRuleResolver). Resolves WarehouseTypeCode from WarehouseId,
 * builds the RuleEvaluationContext, calls Resolve, and maps the RuleDecision onto use-case
 * behavior. This is the ONLY place in the InventoryExecution module allowed to know about the
 * rule engine — use cases call this gate, they never inject RULE_RESOLVER directly.
 */
export class PutawayRuleGate {
  constructor(
    private readonly resolver: IRuleResolver,
    private readonly warehouses: IWarehouseRepository,
  ) {}

  public async Evaluate(input: PutawayRuleGateInput): Promise<PutawayRuleGateOutcome> {
    if (!input.WarehouseId) return {};
    const warehouse = await this.warehouses.FindById(input.WarehouseId);
    if (!warehouse) return {};

    const context: RuleEvaluationContext = {
      WarehouseTypeCode: warehouse.WarehouseTypeCode,
      WarehouseId: input.WarehouseId,
      OwnerId: input.OwnerId ?? null,
      ZoneId: input.ZoneId ?? null,
      LocationType: input.LocationType ?? null,
      SkuId: input.SkuId ?? null,
      ItemClass: input.ItemClass ?? null,
      OrderType: input.OrderType ?? null,
      CustomerId: input.CustomerId ?? null,
      SupplierId: input.SupplierId ?? null,
      ActorUserId: input.ActorUserId ?? null,
      Action: input.Action ?? null,
      ObjectType: input.ObjectType ?? null,
      ObjectId: input.ObjectId ?? null,
      ReasonCode: input.ReasonCode ?? null,
      Attributes: input.Attributes,
    };

    // Fail-closed (R5): resolver.Resolve() is deliberately NOT wrapped in try/catch — a resolver
    // failure must propagate and block the transaction, never be swallowed into a no-op decision.
    const decision = await this.resolver.Resolve(context);

    if (!decision.Allowed) {
      throw new BusinessRuleException(decision.Winner?.RuleCode ?? 'Rule blocked the transaction', {
        ControlMode: 'HARD_BLOCK',
        RuleCode: decision.Winner?.RuleCode ?? null,
        ApprovalRequired: false,
        ReasonReadiness: decision.ReasonReadiness,
      });
    }
    if (decision.ApprovalRequired) {
      throw new BusinessRuleException(decision.Winner?.RuleCode ?? 'Approval required to proceed', {
        ControlMode: 'APPROVAL_REQUIRED',
        RuleCode: decision.Winner?.RuleCode ?? null,
        ApprovalRequired: true,
        ReasonReadiness: decision.ReasonReadiness,
      });
    }
    return { Warning: decision.Warning, Suggestion: decision.Suggestion };
  }
}
