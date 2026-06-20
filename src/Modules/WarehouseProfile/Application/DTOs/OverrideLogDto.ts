import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';

export interface OverrideLogDto {
  Id: string;
  RuleId: string;
  RuleCode: string;
  ActorUserId: string;
  TargetObjectType: ObjectType;
  TargetObjectId: string;
  TargetObjectCode: string | null;
  Scope: Record<string, unknown> | null;
  ControlMode: RuleControlMode;
  Action: ActionCode;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: unknown[] | null;
  ApprovalRequestId: string | null;
  BeforeJson: Record<string, unknown> | null;
  AfterJson: Record<string, unknown> | null;
  AuditRef: string | null;
  CorrelationId: string | null;
  CreatedAt: Date;
}

export interface RequestOverrideDto {
  RuleId: string;
  TargetObjectType: ObjectType;
  TargetObjectId: string;
  TargetObjectCode?: string | null;
  Scope?: Record<string, unknown> | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: unknown[] | null;
  ApprovalRequestId?: string | null;
  BeforeJson?: Record<string, unknown> | null;
}
