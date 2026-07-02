import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

/** Scope axes + actor/object metadata + business Attributes a caller supplies to a rule gate's Evaluate. */
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
 * Shared context-build + resolve + decision-mapping logic behind every per-module rule gate
 * (ADR-1: InboundRuleGate, PutawayRuleGate). Each module still owns its own thin gate class (DI
 * boundary, module separation) but delegates to this single implementation so the AC2 mapping and
 * the AC5 fail-closed behavior can't silently drift between gates (code-review finding on PR #6).
 *
 * Resolves WarehouseTypeCode from WarehouseId, builds the RuleEvaluationContext (WarehouseId AND
 * OwnerId both included — see IRE-00's critical scope-match lesson), calls Resolve, and maps the
 * RuleDecision: Allowed=false or ApprovalRequired=true both throw BusinessRuleException (always
 * block); Warning/Suggestion are returned; an empty decision or an unresolvable WarehouseId is a
 * no-op (ADR-5 backward-compat).
 */
export async function EvaluateRuleGate(
  resolver: IRuleResolver,
  warehouses: IWarehouseRepository,
  input: RuleGateInput,
): Promise<RuleGateOutcome> {
  if (!input.WarehouseId) return {};
  const warehouse = await warehouses.FindById(input.WarehouseId);
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
  const decision = await resolver.Resolve(context);

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
