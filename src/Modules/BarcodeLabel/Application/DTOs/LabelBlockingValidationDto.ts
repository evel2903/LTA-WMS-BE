import { LabelBlockingDecision } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDecision';
import { LabelBlockingDownstreamAction } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDownstreamAction';
import { LabelBlockingPolicyMode } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingPolicyMode';

export interface ValidateLabelBlockingDto {
  DownstreamAction: LabelBlockingDownstreamAction;
  BusinessObjectType: string;
  BusinessObjectId: string;
  BusinessObjectCode?: string | null;
  WarehouseProfileId: string;
  WarehouseId?: string | null;
  OwnerId?: string | null;
  LabelType?: string | null;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: unknown[] | null;
}

export interface LabelBlockingValidationResultDto {
  Allowed: boolean;
  Blocked: boolean;
  Decision: LabelBlockingDecision;
  RequiredLabelType: string | null;
  PolicyMode: LabelBlockingPolicyMode;
  OverrideAllowed: boolean;
  OverrideAccepted: boolean;
  Reason: string;
  MatchedPrintJobId: string | null;
  MatchedPrintJobCode: string | null;
  ValidationDetails: Record<string, unknown>;
}
