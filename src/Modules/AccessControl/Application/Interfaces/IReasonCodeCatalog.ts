import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export const REASON_CODE_CATALOG = Symbol('IReasonCodeCatalog');

export interface ValidateReasonInput {
  ReasonCode: string;
  Action: ActionCode;
  ObjectType: ObjectType;
}

export interface ValidateReasonResult {
  ReasonCodeId: string;
  EvidenceRequired: boolean;
  ApprovalRequired: boolean;
}

/**
 * Shared catalog port (architecture 3.2): override (C7), approval (C6), exception (C9)
 * and audit (C5) validate a reason against the catalog before recording it. Throws
 * BusinessRuleException when the code is unknown, inactive, or not applicable to the
 * (action, object).
 */
export interface IReasonCodeCatalog {
  ValidateReason(input: ValidateReasonInput): Promise<ValidateReasonResult>;
}
