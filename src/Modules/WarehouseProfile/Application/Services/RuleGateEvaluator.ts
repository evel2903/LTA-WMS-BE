import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { ReasonReadiness } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

/** Scope axes + actor/object metadata + business Attributes a caller supplies to a rule gate. */
export interface RuleGateInput {
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
export interface RuleGateOutcome {
  Warning?: { Message: string; RuleCode: string };
  Suggestion?: { Message: string; RuleCode: string };
}

/**
 * Non-throwing resolved view of a RuleDecision, for query-style callers that must map the decision
 * into their own return shape (a readiness DTO, a tolerance enum, an OR-combined flag) instead of
 * throwing (IRE-02+). `Matched` is false for an empty decision — no rule won, or the gate could not
 * build a context (missing/unknown WarehouseId) — which callers treat as ADR-5 backward-compat
 * (fall back to the previous hardcoded behavior).
 */
export interface RuleGateDecision {
  Matched: boolean;
  Blocked: boolean;
  ApprovalRequired: boolean;
  RuleCode: string | null;
  Warning?: { Message: string; RuleCode: string };
  Suggestion?: { Message: string; RuleCode: string };
  ReasonReadiness: ReasonReadiness | null;
}

function EmptyDecision(): RuleGateDecision {
  return { Matched: false, Blocked: false, ApprovalRequired: false, RuleCode: null, ReasonReadiness: null };
}

/**
 * Shared context-build + resolve logic behind every per-module rule gate (ADR-1: InboundRuleGate,
 * PutawayRuleGate). Resolves WarehouseTypeCode from WarehouseId, builds the RuleEvaluationContext
 * (WarehouseId AND OwnerId both included — IRE-00's critical scope-match lesson), calls Resolve,
 * and returns the decision WITHOUT throwing. An unresolvable WarehouseId yields an empty decision
 * (ADR-5 backward-compat). Resolver failures propagate (R5 fail-closed).
 *
 * `preResolvedWarehouse` (IRE-06) lets a caller that already fetched+validated the warehouse itself
 * (PutawayRuleGate's fail-closed guard) pass it through instead of triggering a second identical
 * FindById. Omitted by every InboundRuleGate call site — their behavior is untouched.
 */
export async function ResolveRuleGate(
  resolver: IRuleResolver,
  warehouses: IWarehouseRepository,
  input: RuleGateInput,
  preResolvedWarehouse?: WarehouseEntity,
): Promise<RuleGateDecision> {
  if (!input.WarehouseId) return EmptyDecision();
  const warehouse = preResolvedWarehouse ?? (await warehouses.FindById(input.WarehouseId));
  if (!warehouse) return EmptyDecision();

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
  const decision = await resolver.Resolve(context);

  return {
    Matched: decision.Winner !== null,
    Blocked: !decision.Allowed,
    ApprovalRequired: decision.ApprovalRequired,
    RuleCode: decision.Winner?.RuleCode ?? null,
    Warning: decision.Warning,
    Suggestion: decision.Suggestion,
    ReasonReadiness: decision.ReasonReadiness,
  };
}

/**
 * Throwing variant for command-style callers (a use case that must abort the transaction on a
 * blocking decision). Delegates to ResolveRuleGate and throws on HARD_BLOCK (Allowed=false) or
 * APPROVAL_REQUIRED; otherwise returns the non-blocking Warning/Suggestion signals. Both throw
 * branches always block — never silently pass an approval-required decision.
 */
export async function EvaluateRuleGate(
  resolver: IRuleResolver,
  warehouses: IWarehouseRepository,
  input: RuleGateInput,
  preResolvedWarehouse?: WarehouseEntity,
): Promise<RuleGateOutcome> {
  const decision = await ResolveRuleGate(resolver, warehouses, input, preResolvedWarehouse);

  if (decision.Blocked) {
    throw new BusinessRuleException(decision.RuleCode ?? 'Rule blocked the transaction', {
      ControlMode: 'HARD_BLOCK',
      RuleCode: decision.RuleCode,
      ApprovalRequired: false,
      ReasonReadiness: decision.ReasonReadiness,
    });
  }
  if (decision.ApprovalRequired) {
    throw new BusinessRuleException(decision.RuleCode ?? 'Approval required to proceed', {
      ControlMode: 'APPROVAL_REQUIRED',
      RuleCode: decision.RuleCode,
      ApprovalRequired: true,
      ReasonReadiness: decision.ReasonReadiness,
    });
  }
  return { Warning: decision.Warning, Suggestion: decision.Suggestion };
}
