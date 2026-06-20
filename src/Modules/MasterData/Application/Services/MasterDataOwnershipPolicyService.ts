import { BusinessRuleException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';

export const MASTER_DATA_OWNERSHIP_POLICY_SERVICE = Symbol('MASTER_DATA_OWNERSHIP_POLICY_SERVICE');

const WRITE_ACTIONS = new Set<ActionCode>([
  ActionCode.Create,
  ActionCode.Update,
  ActionCode.DeleteCancel,
  ActionCode.Adjust,
]);

export interface OwnershipEnforceInput {
  ObjectGroup: MasterDataObjectGroup;
  ObjectType: ObjectType;
  Action: ActionCode;
  ReasonCode?: string | null;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}

export interface OwnershipDecision {
  RequiresAudit: boolean;
  ReasonCodeId?: string | null;
}

/**
 * Enforces A6 source-of-truth / data-ownership policy at the mutation surface
 * (FR-8, V0-AC-03.5). External-owned read-only groups (DirectEditAllowed=false, e.g. SKU,
 * Owner, LPN) are hard-blocked for write actions and must come through an integration
 * path; conditional-edit / change-controlled groups must supply reason / source-system /
 * reference-id per their policy flags. When a reason code is supplied it is validated
 * against the shared catalog (C3) and resolved to its id for the audit record (AC2).
 */
export class MasterDataOwnershipPolicyService {
  constructor(
    private readonly policyRepository: IMasterDataOwnershipPolicyRepository,
    private readonly reasonCatalog?: IReasonCodeCatalog,
  ) {}

  public async Enforce(input: OwnershipEnforceInput): Promise<OwnershipDecision> {
    const policy = await this.policyRepository.FindByObjectGroup(input.ObjectGroup);

    // Resolve + validate a supplied reason against the catalog (throws if unknown/inactive/
    // not applicable to the action+object). Resolved id is stored on the audit record.
    let reasonCodeId: string | null = null;
    if (input.ReasonCode && this.reasonCatalog) {
      const resolved = await this.reasonCatalog.ValidateReason({
        ReasonCode: input.ReasonCode,
        Action: input.Action,
        ObjectType: input.ObjectType,
      });
      reasonCodeId = resolved.ReasonCodeId;
    }

    if (!policy) {
      // No policy row → no ownership constraint; still auditable by default.
      return { RequiresAudit: true, ReasonCodeId: reasonCodeId };
    }

    const isWrite = WRITE_ACTIONS.has(input.Action);
    if (isWrite && !policy.DirectEditAllowed) {
      throw new ForbiddenAppException(
        `${input.ObjectGroup} is an external source-of-truth (read-only); direct ${input.Action} is not allowed — use the integration path`,
        { Reason: 'SOURCE_OF_TRUTH_READONLY', ObjectGroup: input.ObjectGroup, Action: input.Action },
      );
    }

    if (isWrite) {
      if (policy.RequiresReason && !reasonCodeId) {
        throw new BusinessRuleException(`${input.ObjectGroup} mutation requires a reason code`);
      }
      if (policy.RequiresSourceSystem && !input.SourceSystem) {
        throw new BusinessRuleException(`${input.ObjectGroup} mutation requires a source system`);
      }
      if (policy.RequiresReferenceId && !input.ReferenceId) {
        throw new BusinessRuleException(`${input.ObjectGroup} mutation requires a reference id`);
      }
    }

    return { RequiresAudit: policy.RequiresAudit, ReasonCodeId: reasonCodeId };
  }
}
