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

    const profile = await this.ResolveProfile(aggregate.Plan);
    const gateInRequired = await this.GateInRequired(aggregate.Plan, profile);
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
      });
    }

    if (request.AttemptOverride) return this.HandleOverride(request, context, aggregate.Plan, profile);

    return this.BuildResult(aggregate.Plan.Id, aggregate.Plan.BusinessReference, {
      Allowed: false,
      Decision: 'Blocked',
      GateInRequired: true,
      GateInRecorded: false,
      Reason: 'Gate-in is required before receiving.',
    });
  }

  private async HandleOverride(
    request: ValidateReceivingReadinessDto,
    context: AuditContext,
    plan: InboundPlanEntity,
    profile: WarehouseProfileEntity | null,
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

    if (!this.GateInOverrideAllowed(profile?.StrategyPolicy as Record<string, unknown> | undefined)) {
      throw new BusinessRuleException('Gate-in readiness override is not allowed by WarehouseProfile');
    }

    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
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
    const result = this.BuildResult(plan.Id, plan.BusinessReference, {
      Allowed: true,
      Decision: 'OverrideAccepted',
      GateInRequired: true,
      GateInRecorded: false,
      OverrideAccepted: true,
      Reason: 'Gate-in readiness override accepted with reason/audit evidence.',
    });

    const before = { GateInStatus: plan.GateInStatus, EvidenceRefs: plan.EvidenceRefs };
    plan.RecordGateInOverride({ EvidenceRefs: request.EvidenceRefs ?? [], UpdatedBy: context.ActorUserId });
    return this.audited.Run(async (manager) => {
      await this.inboundPlans.UpdatePlan(plan, manager);
      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Override,
          ObjectType: ObjectType.CoreFlow,
          ObjectId: plan.CoreFlowInstanceId ?? plan.Id,
          ObjectCode: plan.BusinessReference,
          BeforeJson: before,
          AfterJson: result as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: request.ReasonNote ?? null,
          EvidenceRefs: request.EvidenceRefs ?? null,
          ReferenceType: 'InboundReceivingReadiness',
          ReferenceId: plan.Id,
          WarehouseId: plan.WarehouseId,
          OwnerId: plan.OwnerId,
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
   * Whether gate-in evidence is required before receiving. The rule engine (InboundRuleGate) is the
   * primary source: a matched blocking/approval decision means gate-in is gated. When no rule
   * matches (empty decision — includes plans with no WarehouseProfile / unknown warehouse), fall
   * back to the previous StrategyPolicy key-check (ADR-5 backward-compat).
   */
  private async GateInRequired(plan: InboundPlanEntity, profile: WarehouseProfileEntity | null): Promise<boolean> {
    const decision = await this.ruleGate.Decide({
      WarehouseId: plan.WarehouseId,
      OwnerId: plan.OwnerId,
      Attributes: { [InboundRuleAttributeKeys.HasAppointment]: plan.ExpectedArrivalAt != null },
    });
    if (decision.Matched) return decision.Blocked || decision.ApprovalRequired;
    return this.GateInRequiredFromPolicy(profile?.StrategyPolicy as Record<string, unknown> | undefined);
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
      InboundPlanId: inboundPlanId,
      BusinessReference: businessReference,
    };
  }
}
