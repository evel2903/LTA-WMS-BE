import { BusinessRuleException } from '@common/Exceptions/AppException';
import {
  CORE_FLOW_STAGE_COMPLETION_STEPS,
  CORE_FLOW_STAGE_ORDER,
  CORE_FLOW_STEP_DEFINITIONS,
  FORBIDDEN_INVENTORY_STATUS_MILESTONES,
} from '@modules/CoreFlow/Domain/Constants/CoreFlowStepDefinitions';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';

export class CoreFlowValidation {
  public static AssertStepBelongsToStage(stepCode: CoreFlowStepCode, stageCode: CoreFlowStageCode): void {
    const definition = CORE_FLOW_STEP_DEFINITIONS.find((item) => item.StepCode === stepCode);
    if (!definition || definition.StageCode !== stageCode) {
      throw new BusinessRuleException('CoreFlow step does not belong to the requested stage');
    }
  }

  public static AssertInventoryStatusCode(inventoryStatusCode?: string | null): void {
    if (!inventoryStatusCode) return;
    const normalized = inventoryStatusCode.trim().toUpperCase();
    if (FORBIDDEN_INVENTORY_STATUS_MILESTONES.includes(normalized as never)) {
      throw new BusinessRuleException(`${normalized} is a workflow milestone, not an InventoryStatus`);
    }
  }

  public static PreviousStageFor(targetStage: CoreFlowStageCode): CoreFlowStageCode | null {
    const index = CORE_FLOW_STAGE_ORDER.indexOf(targetStage);
    if (index <= 0) return null;
    return CORE_FLOW_STAGE_ORDER[index - 1];
  }

  public static IsStageComplete(stageCode: CoreFlowStageCode, milestones: WorkflowMilestoneEntity[]): boolean {
    const completionStep = CORE_FLOW_STAGE_COMPLETION_STEPS[stageCode];
    return milestones.some(
      (milestone) =>
        milestone.StageCode === stageCode &&
        milestone.StepCode === completionStep &&
        [WorkflowMilestoneStatus.Completed, WorkflowMilestoneStatus.Skipped].includes(milestone.MilestoneStatus),
    );
  }
}
