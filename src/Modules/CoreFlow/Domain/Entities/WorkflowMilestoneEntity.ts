import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';

export class WorkflowMilestoneEntity {
  public readonly Id: string;
  public readonly CoreFlowInstanceId: string;
  public readonly StageCode: CoreFlowStageCode;
  public readonly StepCode: CoreFlowStepCode;
  public readonly MilestoneStatus: WorkflowMilestoneStatus;
  public readonly InventoryStatusCode: string | null;
  public readonly ReasonCodeId: string | null;
  public readonly ReasonNote: string | null;
  public readonly ExceptionCaseId: string | null;
  public readonly Metadata: Record<string, unknown> | null;
  public readonly OccurredAt: Date;
  public readonly CreatedBy: string | null;

  constructor(params: {
    Id: string;
    CoreFlowInstanceId: string;
    StageCode: CoreFlowStageCode;
    StepCode: CoreFlowStepCode;
    MilestoneStatus: WorkflowMilestoneStatus;
    InventoryStatusCode?: string | null;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    ExceptionCaseId?: string | null;
    Metadata?: Record<string, unknown> | null;
    OccurredAt: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.CoreFlowInstanceId = params.CoreFlowInstanceId;
    this.StageCode = params.StageCode;
    this.StepCode = params.StepCode;
    this.MilestoneStatus = params.MilestoneStatus;
    this.InventoryStatusCode = params.InventoryStatusCode ?? null;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.ExceptionCaseId = params.ExceptionCaseId ?? null;
    this.Metadata = params.Metadata ?? null;
    this.OccurredAt = params.OccurredAt;
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
