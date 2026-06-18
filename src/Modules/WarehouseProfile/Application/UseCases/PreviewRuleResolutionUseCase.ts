import { BusinessRuleException } from '@common/Exceptions/AppException';
import {
  PreviewRuleResolutionInput,
  RulePreviewResult,
} from '@modules/WarehouseProfile/Application/DTOs/PreviewRuleResolutionDto';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RulePreviewResultMapper } from '@modules/WarehouseProfile/Application/Mappers/RulePreviewResultMapper';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';

/**
 * Read-only preview/simulation use case (B4). Pure class (no @Injectable); wired via useFactory
 * in WarehouseProfileModule with [RULE_RESOLVER, RuleConflictDetector].
 *
 * It maps the request onto a B3 RuleEvaluationContext, runs the single B3 resolve path
 * (IRuleResolver, the source of truth), detects same-scope same-category conflicts, and projects
 * everything onto RulePreviewResult. It persists nothing and enforces no permission/reason/evidence
 * — ReasonReadiness / ActorContext are echoed as read-only metadata for B5/Epic C.
 */
export class PreviewRuleResolutionUseCase {
  private readonly mapper = new RulePreviewResultMapper();

  constructor(
    private readonly resolver: IRuleResolver,
    private readonly conflictDetector: RuleConflictDetector,
  ) {}

  public async Execute(input: PreviewRuleResolutionInput): Promise<RulePreviewResult> {
    // WarehouseTypeCode is the one business-required axis (use `== null` / empty check so "0" is a
    // valid code but "" / null / undefined are rejected as a malformed context).
    if (input.WarehouseTypeCode == null || input.WarehouseTypeCode.trim().length === 0) {
      throw new BusinessRuleException('WarehouseTypeCode is required to preview rule resolution');
    }

    const context = this.ToContext(input);
    const decision = await this.resolver.Resolve(context);
    const conflicts = this.conflictDetector.Detect(decision.OrderedCandidates);

    return this.mapper.ToResult(decision, conflicts, input);
  }

  private ToContext(input: PreviewRuleResolutionInput): RuleEvaluationContext {
    return {
      WarehouseTypeCode: input.WarehouseTypeCode,
      WarehouseId: input.WarehouseId ?? null,
      ZoneId: input.ZoneId ?? null,
      LocationType: input.LocationType ?? null,
      OwnerId: input.OwnerId ?? null,
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
      EvaluatedAt: input.EvaluatedAt,
      Attributes: input.Attributes,
    };
  }
}
