import { BusinessRuleException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
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
  Action: ActionCode;
  ReasonCodeId?: string | null;
  SourceSystem?: string | null;
  ReferenceId?: string | null;
}

export interface OwnershipDecision {
  RequiresAudit: boolean;
}

/**
 * Enforces A6 source-of-truth / data-ownership policy at the mutation surface
 * (FR-8, V0-AC-03.5). External-owned read-only groups (DirectEditAllowed=false, e.g. SKU,
 * Owner, LPN) are hard-blocked for write actions and must come through an integration
 * path; conditional-edit groups must supply reason / source-system / reference-id per
 * their policy flags.
 */
export class MasterDataOwnershipPolicyService {
  constructor(private readonly policyRepository: IMasterDataOwnershipPolicyRepository) {}

  public async Enforce(input: OwnershipEnforceInput): Promise<OwnershipDecision> {
    const policy = await this.policyRepository.FindByObjectGroup(input.ObjectGroup);
    if (!policy) {
      // No policy row → no ownership constraint; still auditable by default.
      return { RequiresAudit: true };
    }

    const isWrite = WRITE_ACTIONS.has(input.Action);
    if (isWrite && !policy.DirectEditAllowed) {
      throw new ForbiddenAppException(
        `${input.ObjectGroup} is an external source-of-truth (read-only); direct ${input.Action} is not allowed — use the integration path`,
        { Reason: 'SOURCE_OF_TRUTH_READONLY', ObjectGroup: input.ObjectGroup, Action: input.Action },
      );
    }

    if (isWrite) {
      if (policy.RequiresReason && !input.ReasonCodeId) {
        throw new BusinessRuleException(`${input.ObjectGroup} mutation requires a reason code`);
      }
      if (policy.RequiresSourceSystem && !input.SourceSystem) {
        throw new BusinessRuleException(`${input.ObjectGroup} mutation requires a source system`);
      }
      if (policy.RequiresReferenceId && !input.ReferenceId) {
        throw new BusinessRuleException(`${input.ObjectGroup} mutation requires a reference id`);
      }
    }

    return { RequiresAudit: policy.RequiresAudit };
  }
}
