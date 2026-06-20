import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';

export interface ApprovalRequestDto {
  Id: string;
  RequesterUserId: string;
  Action: ActionCode;
  TargetObjectType: ObjectType;
  TargetObjectId: string;
  TargetObjectCode: string | null;
  Scope: Record<string, unknown> | null;
  RequestReasonCodeId: string | null;
  RequestReasonNote: string | null;
  EvidenceRefs: unknown[] | null;
  Decision: ApprovalDecision;
  DecidedByUserId: string | null;
  DecisionReasonCodeId: string | null;
  DecisionNote: string | null;
  DecidedAt: Date | null;
  ReferenceType: string | null;
  ReferenceId: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CreateApprovalRequestDto {
  Action: ActionCode;
  TargetObjectType: ObjectType;
  TargetObjectId: string;
  TargetObjectCode?: string | null;
  Scope?: Record<string, unknown> | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: unknown[] | null;
  ReferenceType?: string | null;
  ReferenceId?: string | null;
}

export interface DecideApprovalRequestDto {
  Id: string;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: unknown[] | null;
}
