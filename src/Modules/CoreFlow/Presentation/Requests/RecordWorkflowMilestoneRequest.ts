import { IsEnum, IsNotIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { FORBIDDEN_INVENTORY_STATUS_MILESTONES } from '@modules/CoreFlow/Domain/Constants/CoreFlowStepDefinitions';

export class RecordWorkflowMilestoneRequest {
  @IsEnum(CoreFlowStageCode)
  public StageCode!: CoreFlowStageCode;

  @IsEnum(CoreFlowStepCode)
  public StepCode!: CoreFlowStepCode;

  @IsEnum(WorkflowMilestoneStatus)
  public MilestoneStatus!: WorkflowMilestoneStatus;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @IsNotIn([...FORBIDDEN_INVENTORY_STATUS_MILESTONES])
  public InventoryStatusCode?: string;

  @IsOptional()
  @IsObject()
  public Metadata?: Record<string, unknown>;
}
