import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';

export interface ReasonCodeDto {
  Id: string;
  ReasonCode: string;
  ReasonGroup: ReasonGroup;
  Description: string | null;
  AppliesToActions: ActionCode[];
  AppliesToObjects: ObjectType[];
  EvidenceRequired: boolean;
  ApprovalRequired: boolean;
  AllowedRoleCodes: RoleCode[] | null;
  Status: ReasonCodeStatus;
  Version: number;
  EffectiveFrom: Date | null;
  EffectiveTo: Date | null;
}

export interface CreateReasonCodeDto {
  ReasonCode: string;
  ReasonGroup: ReasonGroup;
  Description?: string | null;
  AppliesToActions: ActionCode[];
  AppliesToObjects: ObjectType[];
  EvidenceRequired?: boolean;
  ApprovalRequired?: boolean;
  AllowedRoleCodes?: RoleCode[] | null;
  EffectiveFrom?: string | null;
  EffectiveTo?: string | null;
  ActorUserId?: string;
}

export interface UpdateReasonCodeDto {
  Id: string;
  ReasonGroup?: ReasonGroup;
  Description?: string | null;
  AppliesToActions?: ActionCode[];
  AppliesToObjects?: ObjectType[];
  EvidenceRequired?: boolean;
  ApprovalRequired?: boolean;
  AllowedRoleCodes?: RoleCode[] | null;
  Status?: ReasonCodeStatus;
  EffectiveFrom?: string | null;
  EffectiveTo?: string | null;
  ActorUserId?: string;
}
