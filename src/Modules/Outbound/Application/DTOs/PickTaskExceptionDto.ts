import { ApprovalRequestDto } from '@modules/AccessControl/Application/DTOs/ApprovalRequestDto';
import { ExceptionCaseDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { ReplenishmentTaskDto } from '@modules/InventoryExecution/Application/DTOs/ReplenishmentTaskDto';
import { PickTaskDto } from '@modules/Outbound/Application/DTOs/PickReleaseDto';
import { PickExceptionType } from '@modules/Outbound/Domain/Enums/PickExceptionType';
import { PickSubstitutionStatus } from '@modules/Outbound/Domain/Enums/PickSubstitutionStatus';
import { MobileTaskDto } from '@modules/TaskExecution/Application/DTOs/MobileTaskDto';

export type PickSubstitutionPolicyDecision = 'Allow' | 'RequireApproval' | 'Disallow';

export interface ReportPickExceptionDto {
  MobileTaskId?: string | null;
  ExceptionType: PickExceptionType | string;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  ObservedQuantity?: number | null;
  DamagedQuantity?: number | null;
  ObservedSkuId?: string | null;
  ObservedSkuCode?: string | null;
  ReplenishmentTargetLocationId?: string | null;
  IdempotencyKey: string;
}

export interface RequestPickSubstitutionDto {
  MobileTaskId?: string | null;
  SubstituteSkuId: string;
  SubstituteSkuCode?: string | null;
  SubstituteUomId?: string | null;
  SubstituteUomCode?: string | null;
  Quantity?: number | null;
  PolicyDecision: PickSubstitutionPolicyDecision;
  PolicyReason?: string | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface PickExceptionResultDto {
  PickTask: PickTaskDto;
  MobileTask: MobileTaskDto | null;
  ExceptionCase: ExceptionCaseDto | null;
  ReplenishmentRequired: boolean;
  ReplenishmentTask: ReplenishmentTaskDto | null;
  SubstitutionStatus: PickSubstitutionStatus | null;
  ApprovalRequest: ApprovalRequestDto | null;
  IsDuplicate: boolean;
}
