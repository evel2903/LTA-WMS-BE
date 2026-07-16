import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { BusinessRuleException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ReceivingReadinessDto, ValidateReceivingReadinessDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
import { AssertInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';
import { AssertInboundPlanNotCancelled } from '@modules/Inbound/Application/Services/InboundPlanStatusGuards';
import { InboundRuleAttributeKeys, InboundRuleGate } from '@modules/Inbound/Application/Services/InboundRuleGate';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';

export class ValidateReceivingReadinessUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly ruleGate: InboundRuleGate,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: ValidateReceivingReadinessDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ReceivingReadinessDto> {
    const aggregate = await this.inboundPlans.FindById(request.Id);
    if (!aggregate) throw new NotFoundException('Inbound plan not found');
    await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Read, aggregate.Plan);
    // Re-review fix (P1): readiness (and its override path) is an operational check --
    // reporting/accepting an override on a Cancelled (voided) plan is misleading at best
    // and a real mutation risk at worst. Draft is still deliberately allowed (documented
    // open scope decision), this is a Cancelled-only exclusion.
    AssertInboundPlanNotCancelled(aggregate.Plan.Status);

    const profile = await this.ResolveProfile(aggregate.Plan);
    const gateIn = await this.GateInRequired(aggregate.Plan, profile);
    const gateInRequired = gateIn.Required;
    const gateInRecorded = aggregate.Plan.GateInStatus === InboundGateInStatus.Recorded;
    const overrideAccepted = aggregate.Plan.GateInStatus === InboundGateInStatus.OverrideAccepted;

    if (!gateInRequired || gateInRecorded || overrideAccepted) {
      return this.BuildResult(aggregate.Plan.Id, aggregate.Plan.BusinessReference, {
        Allowed: true,
        Decision: overrideAccepted ? 'OverrideAccepted' : 'Allowed',
        GateInRequired: gateInRequired,
        GateInRecorded: gateInRecorded,
        OverrideAccepted: overrideAccepted,
        Reason: overrideAccepted
          ? 'Gate-in readiness override accepted with reason/audit evidence.'
          : gateInRequired
            ? 'Gate-in evidence is recorded.'
            : 'Gate-in is not required by WarehouseProfile.',
        RuleCode: gateIn.RuleCode,
      });
    }

    if (request.AttemptOverride) {
      return this.HandleOverride(request, context, aggregate.Plan, profile, gateIn.RuleCode);
    }

    return this.BuildResult(aggregate.Plan.Id, aggregate.Plan.BusinessReference, {
      Allowed: false,
      Decision: gateIn.ApprovalRequired ? 'ApprovalRequired' : 'Blocked',
      GateInRequired: true,
      GateInRecorded: false,
      Reason: gateIn.ApprovalRequired
        ? 'Gate-in requires approval before receiving.'
        : 'Gate-in is required before receiving.',
      RuleCode: gateIn.RuleCode,
    });
  }

  private async HandleOverride(
    request: ValidateReceivingReadinessDto,
    context: AuditContext,
    plan: InboundPlanEntity,
    profile: WarehouseProfileEntity | null,
    ruleCode: string | null,
  ): Promise<ReceivingReadinessDto> {
    if (!request.ReasonCode?.trim()) {
      throw new BusinessRuleException('Readiness override reason is required');
    }
    if (!this.permissionChecker || !context.ActorUserId) {
      throw new ForbiddenAppException('Override permission context is required', {
        Action: ActionCode.Override,
        ObjectType: ObjectType.CoreFlow,
      });
    }
    // Captured into locals so the re-check inside the locked transaction below (a nested
    // closure) can reuse them without TypeScript losing the non-null narrowing on `this.x`.
    const permissionChecker = this.permissionChecker;
    const actorUserId = context.ActorUserId;

    if (!this.GateInOverrideAllowed(profile?.StrategyPolicy as Record<string, unknown> | undefined)) {
      throw new BusinessRuleException('Gate-in readiness override is not allowed by WarehouseProfile');
    }

    const decision = await permissionChecker.Check({
      UserId: actorUserId,
      Action: ActionCode.Override,
      ObjectType: ObjectType.CoreFlow,
      Scope: { WarehouseId: plan.WarehouseId, OwnerId: plan.OwnerId },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, {
        Reason: decision.Reason,
        Action: ActionCode.Override,
        ObjectType: ObjectType.CoreFlow,
      });
    }

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Override,
      ObjectType: ObjectType.CoreFlow,
    });
    // Re-review fix (P2): the "OverrideAccepted" result used to be built HERE, from the
    // unlocked `plan` snapshot, and reused as-is for both the response and the audit
    // AfterJson -- now built fresh from `lockedPlan` inside the transaction below, right
    // before it's returned, so a concurrent BusinessReference change can't leak a stale
    // identity into the response/audit trail. See the fresh-result construction below.

    // IFB-24 review fix: mutate+save a row locked via FindByIdForUpdate INSIDE the
    // transaction, not the unlocked `plan` read earlier in Execute() -- UpdatePlan writes
    // the FULL row, so saving the stale unlocked entity here could silently revert a
    // concurrent Confirm/Cancel/Update's Status/CoreFlowInstanceId change (same class of
    // bug fixed for Confirm/Cancel/Update themselves; see RecordGateInUseCase for the
    // identical fix and fuller explanation).
    return this.audited.Run(async (manager) => {
      const aggregate = await this.inboundPlans.FindByIdForUpdate(plan.Id, manager);
      if (!aggregate) throw new NotFoundException('Inbound plan not found');
      const lockedPlan = aggregate.Plan;

      // Re-review fix (authorization TOCTOU): re-check Override permission against the
      // LOCKED (current) Warehouse/Owner scope -- the check above ran against the
      // unlocked `plan` snapshot; a concurrent Update could have moved the plan to a
      // different Warehouse/Owner in the race window before this lock was acquired.
      const lockedDecision = await permissionChecker.Check({
        UserId: actorUserId,
        Action: ActionCode.Override,
        ObjectType: ObjectType.CoreFlow,
        Scope: { WarehouseId: lockedPlan.WarehouseId, OwnerId: lockedPlan.OwnerId },
      });
      if (!lockedDecision.Allowed) {
        throw new ForbiddenAppException(`Access denied (${lockedDecision.Reason})`, {
          Reason: lockedDecision.Reason,
          Action: ActionCode.Override,
          ObjectType: ObjectType.CoreFlow,
        });
      }
      // Re-review fix (P1): re-check Cancelled under the lock too -- the plan could have
      // been cancelled in the race window between the unlocked pre-check above and this
      // lock (Cancel only requires Draft, so a still-Draft plan racing here is exposed).
      AssertInboundPlanNotCancelled(lockedPlan.Status);

      // Second re-review fix: WarehouseProfile/policy were resolved and checked from the
      // UNLOCKED `plan` read at the top of Execute() -- a concurrent change (profile
      // deactivated, gateInOverrideAllowed flipped off, or the plan moved to a
      // Warehouse/Owner the profile no longer matches) in the race window before this
      // lock would otherwise let a now-invalid override through unnoticed. ResolveProfile
      // itself throws BusinessRuleException for "not found" / "not active" / "scope
      // mismatch" (see below), so re-running it against lockedPlan re-validates all of
      // that against the current, committed state, not the stale unlocked snapshot.
      const lockedProfile = await this.ResolveProfile(lockedPlan);
      if (!this.GateInOverrideAllowed(lockedProfile?.StrategyPolicy as Record<string, unknown> | undefined)) {
        throw new BusinessRuleException('Gate-in readiness override is not allowed by WarehouseProfile');
      }

      // Re-review fix: the earlier unlocked read (top of Execute) already proved gate-in
      // wasn't yet Recorded/OverrideAccepted, but that was before this lock was acquired --
      // a concurrent RecordGateInUseCase could have committed Recorded in between. Blindly
      // overwriting it with OverrideAccepted here would silently clobber a legitimate,
      // already-successful gate-in. Re-check under the lock and, if it already resolved,
      // return the now-current state instead of mutating (same non-error semantics as
      // Execute()'s own already-resolved fast path above, and the same idempotent-race
      // safety net used by RecordGateInUseCase).
      if (
        lockedPlan.GateInStatus === InboundGateInStatus.Recorded ||
        lockedPlan.GateInStatus === InboundGateInStatus.OverrideAccepted
      ) {
        const alreadyResolved = this.BuildResult(lockedPlan.Id, lockedPlan.BusinessReference, {
          Allowed: true,
          Decision: lockedPlan.GateInStatus === InboundGateInStatus.OverrideAccepted ? 'OverrideAccepted' : 'Allowed',
          GateInRequired: true,
          GateInRecorded: lockedPlan.GateInStatus === InboundGateInStatus.Recorded,
          OverrideAccepted: lockedPlan.GateInStatus === InboundGateInStatus.OverrideAccepted,
          Reason:
            lockedPlan.GateInStatus === InboundGateInStatus.OverrideAccepted
              ? 'Gate-in readiness override accepted with reason/audit evidence.'
              : 'Gate-in evidence is recorded.',
          RuleCode: ruleCode,
        });
        return {
          result: alreadyResolved,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Override,
            ObjectType: ObjectType.CoreFlow,
            ObjectId: lockedPlan.CoreFlowInstanceId ?? lockedPlan.Id,
            ObjectCode: lockedPlan.BusinessReference,
            BeforeJson: { GateInStatus: lockedPlan.GateInStatus },
            AfterJson: alreadyResolved as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: request.ReasonNote ?? null,
            EvidenceRefs: request.EvidenceRefs ?? null,
            ReferenceType: 'InboundReceivingReadiness',
            ReferenceId: lockedPlan.Id,
            WarehouseId: lockedPlan.WarehouseId,
            OwnerId: lockedPlan.OwnerId,
            Result: AuditResult.Success,
          }),
        };
      }

      const before = { GateInStatus: lockedPlan.GateInStatus, EvidenceRefs: lockedPlan.EvidenceRefs };
      lockedPlan.RecordGateInOverride({ EvidenceRefs: request.EvidenceRefs ?? [], UpdatedBy: context.ActorUserId });
      await this.inboundPlans.UpdatePlan(lockedPlan, manager);
      // Re-review fix (P2): `result` above was built from the UNLOCKED `plan` snapshot
      // read at the top of Execute() -- Id doesn't change, but BusinessReference can (a
      // concurrent Update may have changed SourceSystem/SourceDocumentType/SourceDocument
      // Number in the race window before this lock). Rebuild the returned result AND the
      // audit's AfterJson from lockedPlan so both report the identity that's actually
      // committed, not a possibly-stale one. RuleCode intentionally still comes from the
      // pre-lock rule-engine decision (display/audit-trail info, not a safety decision --
      // see the no-op branch above and this use case's Dev Notes for why that's fine).
      const freshResult = this.BuildResult(lockedPlan.Id, lockedPlan.BusinessReference, {
        Allowed: true,
        Decision: 'OverrideAccepted',
        GateInRequired: true,
        GateInRecorded: false,
        OverrideAccepted: true,
        Reason: 'Gate-in readiness override accepted with reason/audit evidence.',
        RuleCode: ruleCode,
      });
      return {
        result: freshResult,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Override,
          ObjectType: ObjectType.CoreFlow,
          ObjectId: lockedPlan.CoreFlowInstanceId ?? lockedPlan.Id,
          ObjectCode: lockedPlan.BusinessReference,
          BeforeJson: before,
          AfterJson: freshResult as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: request.ReasonNote ?? null,
          EvidenceRefs: request.EvidenceRefs ?? null,
          ReferenceType: 'InboundReceivingReadiness',
          ReferenceId: lockedPlan.Id,
          WarehouseId: lockedPlan.WarehouseId,
          OwnerId: lockedPlan.OwnerId,
          Result: AuditResult.Success,
        }),
      };
    });
  }

  private async ResolveProfile(plan: InboundPlanEntity): Promise<WarehouseProfileEntity | null> {
    if (!plan.WarehouseProfileId) return null;
    const profile = await this.profiles.FindById(plan.WarehouseProfileId);
    if (!profile) throw new BusinessRuleException('WarehouseProfile not found for inbound plan');
    if (profile.Status !== WarehouseProfileStatus.Active) {
      throw new BusinessRuleException('WarehouseProfile is not active for inbound plan');
    }
    if (profile.OwnerId && profile.OwnerId !== plan.OwnerId) {
      throw new BusinessRuleException('WarehouseProfile owner scope does not match inbound plan');
    }
    if (profile.WarehouseId && profile.WarehouseId !== plan.WarehouseId) {
      throw new BusinessRuleException('WarehouseProfile warehouse scope does not match inbound plan');
    }
    return profile;
  }

  /**
   * Whether gate-in evidence is required before receiving. Gate-in gating is governed by the plan's
   * WarehouseProfile: a plan with no linked profile was never gated pre-migration, so we do NOT let
   * a scope-resolved rule newly gate it (ADR-5 backward-compat — and it also keeps the override path,
   * which reads the plan-linked profile, reachable). When a linked profile exists, the rule engine is
   * the primary source: a BLOCKING/APPROVAL decision means gate-in is required. A matched but
   * non-blocking decision (SoftWarning/AutoSuggestion) carries no required signal, so it falls
   * through to the StrategyPolicy key-check rather than suppressing a policy-required gate (no
   * loosening). An empty decision also falls through to the policy (ADR-5). RuleCode/ApprovalRequired
   * are surfaced alongside Required so the caller can persist which rule fired and distinguish a hard
   * block from an approval-only decision (IRE-09) — a policy-fallback gate carries neither, since no
   * rule matched.
   */
  private async GateInRequired(
    plan: InboundPlanEntity,
    profile: WarehouseProfileEntity | null,
  ): Promise<{ Required: boolean; RuleCode: string | null; ApprovalRequired: boolean }> {
    if (!profile) return { Required: false, RuleCode: null, ApprovalRequired: false };
    const decision = await this.ruleGate.Decide({
      WarehouseId: plan.WarehouseId,
      OwnerId: plan.OwnerId,
      Attributes: { [InboundRuleAttributeKeys.HasAppointment]: plan.ExpectedArrivalAt != null },
    });
    if (decision.Blocked || decision.ApprovalRequired) {
      return {
        Required: true,
        RuleCode: decision.RuleCode,
        ApprovalRequired: decision.ApprovalRequired && !decision.Blocked,
      };
    }
    return {
      Required: this.GateInRequiredFromPolicy(profile.StrategyPolicy as Record<string, unknown> | undefined),
      RuleCode: null,
      ApprovalRequired: false,
    };
  }

  private GateInRequiredFromPolicy(policy?: Record<string, unknown>): boolean {
    if (!policy) return false;
    return (
      policy.inboundGateInRequired === true ||
      policy.InboundGateInRequired === true ||
      policy.gateInRequired === true ||
      policy.GateInRequired === true
    );
  }

  private GateInOverrideAllowed(policy?: Record<string, unknown>): boolean {
    if (!policy) return false;
    return policy.gateInOverrideAllowed === true || policy.GateInOverrideAllowed === true;
  }

  private BuildResult(
    inboundPlanId: string,
    businessReference: string,
    overrides: {
      Allowed: boolean;
      Decision: ReceivingReadinessDto['Decision'];
      GateInRequired: boolean;
      GateInRecorded: boolean;
      Reason: string;
      RuleCode: string | null;
      OverrideAccepted?: boolean;
    },
  ): ReceivingReadinessDto {
    return {
      Allowed: overrides.Allowed,
      Blocked: !overrides.Allowed,
      Decision: overrides.Decision,
      GateInRequired: overrides.GateInRequired,
      GateInRecorded: overrides.GateInRecorded,
      OverrideAccepted: overrides.OverrideAccepted ?? false,
      Reason: overrides.Reason,
      RuleCode: overrides.RuleCode,
      InboundPlanId: inboundPlanId,
      BusinessReference: businessReference,
    };
  }
}
