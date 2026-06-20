import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionSubStatus } from '@modules/AccessControl/Domain/Enums/ExceptionSubStatus';
import { ExceptionOutcome } from '@modules/AccessControl/Domain/Enums/ExceptionOutcome';

export interface ExceptionCaseDto {
  Id: string;
  ExceptionType: string;
  State: ExceptionState;
  SubStatus: ExceptionSubStatus | null;
  Outcome: ExceptionOutcome | null;
  ReferenceType: string;
  ReferenceId: string;
  WarehouseId: string | null;
  OwnerId: string | null;
  ReasonCodeId: string | null;
  AssignedToUserId: string | null;
  AssignedRoleId: string | null;
  DetectedRuleId: string | null;
  ApprovalRequestId: string | null;
  Severity: ControlExceptionSeverity;
  EvidenceRefs: unknown[] | null;
  ResolutionNote: string | null;
  OpenedAt: Date;
  ResolvedAt: Date | null;
  ClosedAt: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CreateExceptionDto {
  ExceptionType: string;
  ReferenceType: string;
  ReferenceId: string;
  Severity?: ControlExceptionSeverity | null;
  WarehouseId?: string | null;
  OwnerId?: string | null;
  DetectedRuleId?: string | null;
  EvidenceRefs?: unknown[] | null;
}

export interface LogExceptionDto {
  Id: string;
  HardBlock?: boolean;
}

export interface AssignExceptionDto {
  Id: string;
  AssignedToUserId?: string | null;
  AssignedRoleId?: string | null;
  OwnerId?: string | null;
}

export interface SubmitExceptionForApprovalDto {
  Id: string;
  RequireApproval?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
}

export interface ResolveExceptionDto {
  Id: string;
  ReasonCode?: string | null;
  ResolutionNote?: string | null;
  EvidenceRefs?: unknown[] | null;
}

export interface CloseExceptionDto {
  Id: string;
}
