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
import {
  LabelBlockingValidationResultDto,
  ValidateLabelBlockingDto,
} from '@modules/BarcodeLabel/Application/DTOs/LabelBlockingValidationDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { LabelBlockingDecision } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDecision';
import { LabelBlockingDownstreamAction } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDownstreamAction';
import { LabelBlockingPolicyMode } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingPolicyMode';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';

interface LabelBlockingRule {
  downstreamAction?: string;
  businessObjectType?: string;
  labelType?: string;
  required?: boolean;
  mode?: string;
  overrideAllowed?: boolean;
}

const VALID_LABEL_STATUSES = [PrintJobStatus.Previewed, PrintJobStatus.Reprinted];

export class ValidateLabelBlockingUseCase {
  constructor(
    private readonly labels: IBarcodeLabelRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited?: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: ValidateLabelBlockingDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<LabelBlockingValidationResultDto> {
    const profile = await this.profiles.FindById(request.WarehouseProfileId);
    if (!profile) throw new NotFoundException('Warehouse profile not found');
    this.AssertProfileScope(profile, request);

    const rule = this.FindRule(profile, request);
    if (!rule || rule.required !== true) {
      return this.BuildResult(request, {
        Allowed: true,
        Decision: LabelBlockingDecision.NotRequired,
        PolicyMode: LabelBlockingPolicyMode.None,
        Reason: 'No label blocking rule required for this action.',
      });
    }

    const requiredLabelType = rule.labelType?.trim() || request.LabelType?.trim() || null;
    const printJob = await this.labels.FindLatestValidPrintJobForObject({
      BusinessObjectType: request.BusinessObjectType,
      BusinessObjectId: request.BusinessObjectId,
      WarehouseId: request.WarehouseId ?? null,
      OwnerId: request.OwnerId ?? null,
      LabelType: requiredLabelType,
      ValidStatuses: VALID_LABEL_STATUSES,
    });

    if (printJob) {
      return this.BuildResult(request, {
        Allowed: true,
        Decision: LabelBlockingDecision.Allowed,
        RequiredLabelType: requiredLabelType,
        PolicyMode: this.PolicyMode(rule),
        OverrideAllowed: this.OverrideAllowed(rule),
        Reason: 'Required label evidence is valid.',
        MatchedPrintJobId: printJob.Id,
        MatchedPrintJobCode: printJob.JobCode,
      });
    }

    if (request.AttemptOverride) {
      return await this.HandleOverride(request, context, rule, requiredLabelType);
    }

    return this.BuildResult(request, {
      Allowed: false,
      Decision: LabelBlockingDecision.Blocked,
      RequiredLabelType: requiredLabelType,
      PolicyMode: this.PolicyMode(rule),
      OverrideAllowed: this.OverrideAllowed(rule),
      Reason: 'Required label evidence is missing.',
    });
  }

  private async HandleOverride(
    request: ValidateLabelBlockingDto,
    context: AuditContext,
    rule: LabelBlockingRule,
    requiredLabelType: string | null,
  ): Promise<LabelBlockingValidationResultDto> {
    const objectType = this.OwnerObjectType(request.DownstreamAction);
    const policyMode = this.PolicyMode(rule);
    const overrideAllowed = this.OverrideAllowed(rule);

    if (policyMode === LabelBlockingPolicyMode.Hard || !overrideAllowed) {
      const result = this.BuildResult(request, {
        Allowed: false,
        Decision: LabelBlockingDecision.Blocked,
        RequiredLabelType: requiredLabelType,
        PolicyMode: policyMode,
        OverrideAllowed: false,
        Reason: 'Label blocking rule is not overrideable.',
      });
      return await this.AuditOverrideAttempt(request, context, objectType, result, null, AuditResult.Failed);
    }

    const reasonCode = request.ReasonCode?.trim();
    if (!reasonCode) {
      const result = this.BuildResult(request, {
        Allowed: false,
        Decision: LabelBlockingDecision.Blocked,
        RequiredLabelType: requiredLabelType,
        PolicyMode: policyMode,
        OverrideAllowed: true,
        Reason: 'Override reason is required.',
      });
      await this.AuditOverrideAttempt(request, context, objectType, result, null, AuditResult.Failed);
      throw new BusinessRuleException('Override reason is required', { ReasonCode: 'required' });
    }

    if (!this.permissionChecker || !context.ActorUserId) {
      const result = this.BuildResult(request, {
        Allowed: false,
        Decision: LabelBlockingDecision.Blocked,
        RequiredLabelType: requiredLabelType,
        PolicyMode: policyMode,
        OverrideAllowed: true,
        Reason: 'Override permission context is required.',
      });
      await this.AuditOverrideAttempt(request, context, objectType, result, null, AuditResult.Failed);
      throw new ForbiddenAppException('Override permission context is required', {
        Action: ActionCode.Override,
        ObjectType: objectType,
      });
    }

    const decision = await this.permissionChecker.Check({
      UserId: context.ActorUserId,
      Action: ActionCode.Override,
      ObjectType: objectType,
      Scope: { WarehouseId: request.WarehouseId ?? undefined, OwnerId: request.OwnerId ?? undefined },
    });
    if (!decision.Allowed) {
      const result = this.BuildResult(request, {
        Allowed: false,
        Decision: LabelBlockingDecision.Blocked,
        RequiredLabelType: requiredLabelType,
        PolicyMode: policyMode,
        OverrideAllowed: true,
        Reason: 'Override permission denied.',
      });
      await this.AuditOverrideAttempt(request, context, objectType, result, null, AuditResult.Failed);
      throw new ForbiddenAppException(`Access denied (${decision.Reason})`, {
        Reason: decision.Reason,
        Action: ActionCode.Override,
        ObjectType: objectType,
      });
    }

    let reason;
    try {
      reason = await this.reasonCatalog.ValidateReason({
        ReasonCode: reasonCode,
        Action: ActionCode.Override,
        ObjectType: objectType,
      });
    } catch (error) {
      const result = this.BuildResult(request, {
        Allowed: false,
        Decision: LabelBlockingDecision.Blocked,
        RequiredLabelType: requiredLabelType,
        PolicyMode: policyMode,
        OverrideAllowed: true,
        Reason: 'Override reason is invalid.',
      });
      await this.AuditOverrideAttempt(request, context, objectType, result, null, AuditResult.Failed);
      throw error;
    }
    const result = this.BuildResult(request, {
      Allowed: true,
      Decision: LabelBlockingDecision.OverrideAccepted,
      RequiredLabelType: requiredLabelType,
      PolicyMode: policyMode,
      OverrideAllowed: true,
      OverrideAccepted: true,
      Reason: 'Label block override accepted with reason/audit evidence.',
    });
    return await this.AuditOverrideAttempt(
      request,
      context,
      objectType,
      result,
      reason.ReasonCodeId,
      AuditResult.Success,
    );
  }

  private async AuditOverrideAttempt(
    request: ValidateLabelBlockingDto,
    context: AuditContext,
    objectType: ObjectType,
    result: LabelBlockingValidationResultDto,
    reasonCodeId: string | null,
    auditResult: AuditResult,
  ): Promise<LabelBlockingValidationResultDto> {
    if (!this.audited) return result;

    return await this.audited.Run(async () => ({
      result,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Override,
        ObjectType: objectType,
        ObjectId: request.BusinessObjectId,
        ObjectCode: request.BusinessObjectCode ?? null,
        AfterJson: result as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
        ReasonNote: request.ReasonNote ?? null,
        EvidenceRefs: request.EvidenceRefs ?? null,
        ReferenceType: request.BusinessObjectType,
        ReferenceId: request.BusinessObjectId,
        WarehouseId: request.WarehouseId ?? null,
        OwnerId: request.OwnerId ?? null,
        Result: auditResult,
      }),
    }));
  }

  private AssertProfileScope(profile: WarehouseProfileEntity, request: ValidateLabelBlockingDto): void {
    const requestWarehouseId = request.WarehouseId?.trim() || null;
    const requestOwnerId = request.OwnerId?.trim() || null;

    if (profile.WarehouseId && profile.WarehouseId !== requestWarehouseId) {
      throw new ForbiddenAppException('Warehouse profile scope does not match validation scope', {
        WarehouseProfileId: profile.Id,
        WarehouseId: requestWarehouseId,
      });
    }
    if (profile.OwnerId && profile.OwnerId !== requestOwnerId) {
      throw new ForbiddenAppException('Warehouse profile owner scope does not match validation scope', {
        WarehouseProfileId: profile.Id,
        OwnerId: requestOwnerId,
      });
    }
  }

  private FindRule(profile: WarehouseProfileEntity, request: ValidateLabelBlockingDto): LabelBlockingRule | null {
    const policy = profile.LabelDevicePolicy as Record<string, unknown>;
    const rules = (policy.labelBlockingRules ?? policy.LabelBlockingRules) as unknown;
    if (!Array.isArray(rules)) return null;
    return (
      rules
        .filter((item): item is LabelBlockingRule => item != null && typeof item === 'object')
        .find((rule) => {
          const actionMatches = rule.downstreamAction === request.DownstreamAction;
          const objectMatches =
            !rule.businessObjectType ||
            rule.businessObjectType.toLowerCase() === request.BusinessObjectType.toLowerCase();
          return actionMatches && objectMatches;
        }) ?? null
    );
  }

  private PolicyMode(rule: LabelBlockingRule): LabelBlockingPolicyMode {
    return rule.mode === LabelBlockingPolicyMode.Soft ? LabelBlockingPolicyMode.Soft : LabelBlockingPolicyMode.Hard;
  }

  private OverrideAllowed(rule: LabelBlockingRule): boolean {
    return this.PolicyMode(rule) === LabelBlockingPolicyMode.Soft && rule.overrideAllowed === true;
  }

  private OwnerObjectType(action: LabelBlockingDownstreamAction): ObjectType {
    if (action === LabelBlockingDownstreamAction.Putaway) return ObjectType.PutawayTask;
    if (action === LabelBlockingDownstreamAction.Loading) return ObjectType.Load;
    return ObjectType.Package;
  }

  private BuildResult(
    request: ValidateLabelBlockingDto,
    overrides: Partial<LabelBlockingValidationResultDto> & {
      Allowed: boolean;
      Decision: LabelBlockingDecision;
      Reason: string;
    },
  ): LabelBlockingValidationResultDto {
    const blocked = !overrides.Allowed;
    return {
      Allowed: overrides.Allowed,
      Blocked: blocked,
      Decision: overrides.Decision,
      RequiredLabelType: overrides.RequiredLabelType ?? request.LabelType ?? null,
      PolicyMode: overrides.PolicyMode ?? LabelBlockingPolicyMode.None,
      OverrideAllowed: overrides.OverrideAllowed ?? false,
      OverrideAccepted: overrides.OverrideAccepted ?? false,
      Reason: overrides.Reason,
      MatchedPrintJobId: overrides.MatchedPrintJobId ?? null,
      MatchedPrintJobCode: overrides.MatchedPrintJobCode ?? null,
      ValidationDetails: {
        DownstreamAction: request.DownstreamAction,
        BusinessObjectType: request.BusinessObjectType,
        BusinessObjectId: request.BusinessObjectId,
        WarehouseProfileId: request.WarehouseProfileId,
        WarehouseId: request.WarehouseId ?? null,
        OwnerId: request.OwnerId ?? null,
      },
    };
  }
}
