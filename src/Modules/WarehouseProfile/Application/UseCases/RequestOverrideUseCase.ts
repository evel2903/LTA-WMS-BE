import { randomUUID } from 'crypto';
import { BusinessRuleException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { OverrideLogEntity } from '@modules/WarehouseProfile/Domain/Entities/OverrideLogEntity';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IOverrideLogRepository } from '@modules/WarehouseProfile/Application/Interfaces/IOverrideLogRepository';
import { RequestOverrideDto, OverrideLogDto } from '@modules/WarehouseProfile/Application/DTOs/OverrideLogDto';
import { OverrideLogDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/OverrideLogDtoMapper';

/**
 * Controlled override of a non-compliance rule outcome (architecture 6.7, FR-11/FR-17, AC2-AC5).
 *
 * The decision is AUTHORITATIVE from the rule definition (never trust the client):
 *  - AC3: a Compliance-tier / HARD_BLOCK / AllowOverride=false rule can NEVER be overridden.
 *  - AC2/AC4: override succeeds only with permission (Override, OverrideLog) + reason (when the rule
 *    RequiresReason) + evidence (when the rule RequiresEvidence or the reason demands it) + an
 *    APPROVED ApprovalRequest (when ControlMode === APPROVAL_REQUIRED).
 *  - AC1/AC5: on success, one immutable override_logs row + one Override audit row are written in the
 *    SAME transaction (rollback together).
 *
 * The override reason justifies overriding THE RULE, so it is validated against
 * (Override, Rule) — the (Action, ObjectType) the RC-RULE-OVERRIDE seed satisfies. Validating
 * against (Override, OverrideLog) would reject every reason (no catalog entry covers that pair).
 */
export class RequestOverrideUseCase {
  // OVERRIDE_REASON_OBJECT is the object the override reason applies to: the rule being overridden.
  private static readonly OVERRIDE_REASON_OBJECT = ObjectType.Rule;

  // auditedTransaction is optional only so fixture-setup tests can construct the use case bare;
  // the module always wires it.
  constructor(
    private readonly ruleDefinitions: IRuleDefinitionRepository,
    private readonly overrideLogs: IOverrideLogRepository,
    private readonly permissionChecker: IPermissionChecker,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly approvalRequests: IApprovalRequestRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: RequestOverrideDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<OverrideLogDto> {
    const actorUserId = context.ActorUserId;
    if (!actorUserId) {
      throw new ForbiddenAppException('Access denied (PERMISSION_DENIED)', { Reason: 'PERMISSION_DENIED' });
    }

    // 1) Load the rule — authoritative source for the override-readiness flags.
    const rule = await this.ruleDefinitions.FindById(request.RuleId);
    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    // 1b) Only a rule that is actually in force can be overridden — a DRAFT/RETIRED or
    // out-of-effective-window rule never produced a live block, so "overriding" it would forge a
    // meaningless immutable log entry. (Authoritative from the rule definition, not client input.)
    const now = new Date();
    const inEffectiveWindow = now >= rule.EffectiveFrom && (rule.EffectiveTo == null || now < rule.EffectiveTo);
    if (rule.Status !== RuleStatus.Active || !inEffectiveWindow) {
      throw new BusinessRuleException('Cannot override a rule that is not active and in its effective window');
    }

    // 2) AC3 — never override a compliance hard block. Authoritative, not client-supplied.
    if (
      rule.ControlMode === RuleControlMode.HardBlock ||
      rule.PrecedenceTier === RulePrecedenceTier.Compliance ||
      rule.AllowOverride === false
    ) {
      throw new ForbiddenAppException('Compliance/hard-block cannot be overridden', {
        Reason: 'OVERRIDE_NOT_ALLOWED',
      });
    }

    // 3) AC2/AC4 — permission (Override, OverrideLog) under the rule/target scope (incl. segregation).
    const scope = {
      ...(request.Scope ?? {}),
      WarehouseId: rule.WarehouseId ?? (request.Scope?.WarehouseId as string | undefined) ?? null,
      ZoneId: rule.ZoneId ?? (request.Scope?.ZoneId as string | undefined) ?? null,
      OwnerId: rule.OwnerId ?? (request.Scope?.OwnerId as string | undefined) ?? null,
    };
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: ActionCode.Override,
      ObjectType: ObjectType.OverrideLog,
      Scope: scope,
    });
    if (!decision.Allowed) {
      const reason = decision.Reason ?? 'PERMISSION_DENIED';
      throw new ForbiddenAppException(`Access denied (${reason})`, { Reason: reason });
    }

    // 4) AC2/AC4 — reason + evidence per the rule flags.
    let reasonCodeId: string | null = null;
    let evidenceRequired = rule.RequiresEvidence;
    if (rule.RequiresReason && !request.ReasonCode) {
      throw new BusinessRuleException('Override requires a reason code for this rule');
    }
    if (request.ReasonCode) {
      const validated = await this.reasonCatalog.ValidateReason({
        ReasonCode: request.ReasonCode,
        Action: ActionCode.Override,
        ObjectType: RequestOverrideUseCase.OVERRIDE_REASON_OBJECT,
      });
      reasonCodeId = validated.ReasonCodeId;
      evidenceRequired = evidenceRequired || validated.EvidenceRequired;
    }
    if (evidenceRequired && !(request.EvidenceRefs && request.EvidenceRefs.length > 0)) {
      throw new BusinessRuleException('Override requires evidence for this rule');
    }

    // 5) AC2/AC4 — approval per the rule control mode. Consume an APPROVED ApprovalRequest (C6).
    if (rule.ControlMode === RuleControlMode.ApprovalRequired) {
      if (!request.ApprovalRequestId) {
        throw new BusinessRuleException('Override requires an approved approval request');
      }
      const consumedApproval = await this.overrideLogs.List(0, 1, { ApprovalRequestId: request.ApprovalRequestId });
      if (consumedApproval.TotalItems > 0) {
        throw new BusinessRuleException('Approval request has already been consumed by another override');
      }
      const approval = await this.approvalRequests.FindById(request.ApprovalRequestId);
      // The approval must be APPROVED *and* be for THIS override of THIS target — match action +
      // object type + id, not the id alone (ids are loosely-typed strings; an approval granted for a
      // different action or object type that happens to share the id must not authorize this override).
      if (
        !approval ||
        approval.Decision !== ApprovalDecision.Approved ||
        approval.Action !== ActionCode.Override ||
        approval.TargetObjectType !== request.TargetObjectType ||
        approval.TargetObjectId !== request.TargetObjectId
      ) {
        throw new BusinessRuleException('Override requires an approved approval request matching the target');
      }
    }

    // 6) AC1/AC5 — persist the immutable override_log + the Override audit row in one transaction.
    const entity = new OverrideLogEntity({
      Id: randomUUID(),
      RuleId: rule.Id,
      RuleCode: rule.RuleCode,
      ActorUserId: actorUserId,
      TargetObjectType: request.TargetObjectType,
      TargetObjectId: request.TargetObjectId,
      TargetObjectCode: request.TargetObjectCode ?? null,
      // Persist the ENRICHED scope the permission decision was actually evaluated against (rule's
      // scope axes merged in), so the immutable log + audit reflect the real authorization context.
      Scope: scope,
      ControlMode: rule.ControlMode,
      Action: ActionCode.Override,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? null,
      ApprovalRequestId: request.ApprovalRequestId ?? null,
      BeforeJson: request.BeforeJson ?? null,
      AfterJson: { Overridden: true, ControlMode: rule.ControlMode, RuleCode: rule.RuleCode },
      AuditRef: context.CorrelationId,
      CorrelationId: context.CorrelationId,
      CreatedAt: now,
      CreatedBy: actorUserId,
    });

    const buildEntry = (saved: OverrideLogEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Override,
        ObjectType: ObjectType.OverrideLog,
        ObjectId: saved.Id,
        ObjectCode: saved.RuleCode,
        BeforeJson: saved.BeforeJson,
        AfterJson: saved.AfterJson,
        ReasonCodeId: saved.ReasonCodeId,
        ReasonNote: saved.ReasonNote,
        EvidenceRefs: saved.EvidenceRefs,
        ReferenceType: 'OverrideLog',
        ReferenceId: saved.Id,
        ScopeJson: saved.Scope,
      });

    if (!this.auditedTransaction) {
      const saved = await this.overrideLogs.Create(entity);
      return OverrideLogDtoMapper.ToDto(saved);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const saved = await this.overrideLogs.Create(entity, manager);
      return { result: OverrideLogDtoMapper.ToDto(saved), entry: buildEntry(saved) };
    });
  }
}
