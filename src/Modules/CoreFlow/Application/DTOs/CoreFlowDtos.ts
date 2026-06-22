import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { WorkflowHandoffStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowHandoffStatus';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';

export interface CreateCoreFlowInstanceDto {
  BusinessReference: string;
  SourceSystem: string;
  WarehouseCode: string;
  OwnerCode?: string | null;
  CorrelationId?: string | null;
  Metadata?: Record<string, unknown> | null;
}

export interface ResolveCoreFlowInstanceDto {
  BusinessReference: string;
  WarehouseCode?: string;
  OwnerCode?: string;
}

export interface RecordWorkflowMilestoneDto {
  CoreFlowInstanceId: string;
  StageCode: CoreFlowStageCode;
  StepCode: CoreFlowStepCode;
  MilestoneStatus: WorkflowMilestoneStatus;
  InventoryStatusCode?: string | null;
  Metadata?: Record<string, unknown> | null;
}

export interface SkipCoreFlowStepDto {
  CoreFlowInstanceId: string;
  StageCode: CoreFlowStageCode;
  StepCode: CoreFlowStepCode;
  ReasonCode: string;
  ReasonNote?: string | null;
  ExceptionCaseId?: string | null;
  Metadata?: Record<string, unknown> | null;
}

export interface CreateWorkflowHandoffDto {
  CoreFlowInstanceId: string;
  FromStage: CoreFlowStageCode;
  ToStage: CoreFlowStageCode;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  Force?: boolean;
  Metadata?: Record<string, unknown> | null;
}

export interface CoreFlowInstanceDto {
  Id: string;
  BusinessReference: string;
  SourceSystem: string;
  WarehouseCode: string;
  OwnerCode: string | null;
  CorrelationId: string;
  CurrentStage: CoreFlowStageCode;
  Status: CoreFlowInstanceStatus;
  Metadata: Record<string, unknown> | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface WorkflowMilestoneDto {
  Id: string;
  CoreFlowInstanceId: string;
  StageCode: CoreFlowStageCode;
  StepCode: CoreFlowStepCode;
  MilestoneStatus: WorkflowMilestoneStatus;
  InventoryStatusCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  ExceptionCaseId: string | null;
  Metadata: Record<string, unknown> | null;
  OccurredAt: Date;
  CreatedBy: string | null;
}

export interface WorkflowHandoffDto {
  Id: string;
  CoreFlowInstanceId: string;
  FromStage: CoreFlowStageCode;
  ToStage: CoreFlowStageCode;
  HandoffStatus: WorkflowHandoffStatus;
  BlockedReason: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  Metadata: Record<string, unknown> | null;
  OccurredAt: Date;
  CreatedBy: string | null;
}
