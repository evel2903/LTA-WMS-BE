import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { WorkflowHandoffStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowHandoffStatus';

export class WorkflowHandoffEntity {
  public readonly Id: string;
  public readonly CoreFlowInstanceId: string;
  public readonly FromStage: CoreFlowStageCode;
  public readonly ToStage: CoreFlowStageCode;
  public readonly HandoffStatus: WorkflowHandoffStatus;
  public readonly BlockedReason: string | null;
  public readonly ReasonCodeId: string | null;
  public readonly ReasonNote: string | null;
  public readonly Metadata: Record<string, unknown> | null;
  public readonly OccurredAt: Date;
  public readonly CreatedBy: string | null;

  constructor(params: {
    Id: string;
    CoreFlowInstanceId: string;
    FromStage: CoreFlowStageCode;
    ToStage: CoreFlowStageCode;
    HandoffStatus: WorkflowHandoffStatus;
    BlockedReason?: string | null;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    Metadata?: Record<string, unknown> | null;
    OccurredAt: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.CoreFlowInstanceId = params.CoreFlowInstanceId;
    this.FromStage = params.FromStage;
    this.ToStage = params.ToStage;
    this.HandoffStatus = params.HandoffStatus;
    this.BlockedReason = params.BlockedReason ?? null;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.Metadata = params.Metadata ?? null;
    this.OccurredAt = params.OccurredAt;
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
