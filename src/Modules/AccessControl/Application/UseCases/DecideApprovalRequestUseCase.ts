import { BusinessRuleException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import {
  DecideApprovalRequestDto,
  ApprovalRequestDto,
} from '@modules/AccessControl/Application/DTOs/ApprovalRequestDto';
import { ApprovalRequestDtoMapper } from '@modules/AccessControl/Application/Mappers/ApprovalRequestDtoMapper';

/**
 * Shared approve/reject lifecycle (architecture 6.7). A PENDING request is decided once
 * (already-decided guard); self-approval is blocked via the C2 PermissionChecker
 * segregation (Scope.RequesterUserId === UserId -> SELF_APPROVAL) PLUS a defensive domain
 * guard (AC3); permission + scope are re-checked (AC4); the decision reason (when given) is
 * validated and evidence enforced (AC4); the update + its Approve audit row (Decision in the
 * Before/After image) commit in one transaction (AC5). The audit Action is always Approve —
 * the ActionCode enum has no Reject token; the Before/After image carries APPROVED vs REJECTED.
 */
export abstract class DecideApprovalRequestUseCase {
  protected abstract readonly TargetDecision: ApprovalDecision;

  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it.
  constructor(
    private readonly approvalRequests: IApprovalRequestRepository,
    private readonly permissionChecker: IPermissionChecker,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: DecideApprovalRequestDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ApprovalRequestDto> {
    const actorUserId = context.ActorUserId;
    if (!actorUserId) {
      throw new ForbiddenAppException('Access denied (PERMISSION_DENIED)', { Reason: 'PERMISSION_DENIED' });
    }

    const entity = await this.approvalRequests.FindById(request.Id);
    if (!entity) {
      throw new NotFoundException('Approval request not found');
    }
    if (!entity.IsPending()) {
      throw new BusinessRuleException('Request already decided');
    }

    // (b) self-approval + permission/scope (C2 PermissionChecker segregation).
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: ActionCode.Approve,
      ObjectType: ObjectType.ApprovalRequest,
      Scope: { ...(entity.Scope ?? {}), RequesterUserId: entity.RequesterUserId },
    });
    if (!decision.Allowed) {
      const reason = decision.Reason ?? 'PERMISSION_DENIED';
      throw new ForbiddenAppException(`Access denied (${reason})`, { Reason: reason });
    }

    // (c) defensive domain guard so segregation never depends solely on the permission layer.
    if (entity.RequesterUserId === actorUserId) {
      throw new ForbiddenAppException('Access denied (SELF_APPROVAL)', { Reason: 'SELF_APPROVAL' });
    }

    // (d) reason/evidence policy for the decision (Action=Approve).
    let decisionReasonCodeId: string | null = null;
    if (request.ReasonCode) {
      const validated = await this.reasonCatalog.ValidateReason({
        ReasonCode: request.ReasonCode,
        Action: ActionCode.Approve,
        ObjectType: ObjectType.ApprovalRequest,
      });
      decisionReasonCodeId = validated.ReasonCodeId;
      if (validated.EvidenceRequired && !(request.EvidenceRefs && request.EvidenceRefs.length > 0)) {
        throw new BusinessRuleException(`Evidence is required for reason code ${request.ReasonCode}`);
      }
    }

    // (e) capture before-image (pending snapshot) for the audit record.
    const before = ApprovalRequestDtoMapper.ToDto(entity) as unknown as Record<string, unknown>;
    const applyDecision = (target: ApprovalRequestEntity): void => {
      target.Decision = this.TargetDecision;
      target.DecidedByUserId = actorUserId;
      target.DecisionReasonCodeId = decisionReasonCodeId;
      target.DecisionNote = request.ReasonNote ?? null;
      target.DecidedAt = new Date();
      target.UpdatedAt = new Date();
      target.UpdatedBy = actorUserId;
    };

    const buildEntry = (updated: ApprovalRequestEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Approve,
        ObjectType: ObjectType.ApprovalRequest,
        ObjectId: updated.Id,
        ObjectCode: updated.TargetObjectCode,
        BeforeJson: before,
        AfterJson: ApprovalRequestDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: updated.DecisionReasonCodeId,
        ReasonNote: updated.DecisionNote,
        EvidenceRefs: request.EvidenceRefs ?? null,
        ReferenceType: updated.ReferenceType,
        ReferenceId: updated.ReferenceId,
        ScopeJson: updated.Scope,
      });

    if (!this.auditedTransaction) {
      applyDecision(entity);
      const updated = await this.approvalRequests.Update(entity);
      return ApprovalRequestDtoMapper.ToDto(updated);
    }
    // Authoritative guard: re-load with a write lock INSIDE the transaction and re-check PENDING,
    // closing the read-check-write race so one request can never be decided twice concurrently.
    return this.auditedTransaction.Run(async (manager) => {
      const locked = await this.approvalRequests.FindByIdForUpdate(request.Id, manager);
      if (!locked) {
        throw new NotFoundException('Approval request not found');
      }
      if (!locked.IsPending()) {
        throw new BusinessRuleException('Request already decided');
      }
      applyDecision(locked);
      const updated = await this.approvalRequests.Update(locked, manager);
      return { result: ApprovalRequestDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
