import {
  CoreFlowInstanceDto,
  WorkflowHandoffDto,
  WorkflowMilestoneDto,
} from '@modules/CoreFlow/Application/DTOs/CoreFlowDtos';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';

export class CoreFlowDtoMapper {
  public static ToInstanceDto(instance: CoreFlowInstanceEntity): CoreFlowInstanceDto {
    return {
      Id: instance.Id,
      BusinessReference: instance.BusinessReference,
      SourceSystem: instance.SourceSystem,
      WarehouseCode: instance.WarehouseCode,
      OwnerCode: instance.OwnerCode,
      CorrelationId: instance.CorrelationId,
      CurrentStage: instance.CurrentStage,
      Status: instance.Status,
      Metadata: instance.Metadata,
      CreatedAt: instance.CreatedAt,
      UpdatedAt: instance.UpdatedAt,
      CreatedBy: instance.CreatedBy,
      UpdatedBy: instance.UpdatedBy,
    };
  }

  public static ToMilestoneDto(milestone: WorkflowMilestoneEntity): WorkflowMilestoneDto {
    return {
      Id: milestone.Id,
      CoreFlowInstanceId: milestone.CoreFlowInstanceId,
      StageCode: milestone.StageCode,
      StepCode: milestone.StepCode,
      MilestoneStatus: milestone.MilestoneStatus,
      InventoryStatusCode: milestone.InventoryStatusCode,
      ReasonCodeId: milestone.ReasonCodeId,
      ReasonNote: milestone.ReasonNote,
      ExceptionCaseId: milestone.ExceptionCaseId,
      Metadata: milestone.Metadata,
      OccurredAt: milestone.OccurredAt,
      CreatedBy: milestone.CreatedBy,
    };
  }

  public static ToHandoffDto(handoff: WorkflowHandoffEntity): WorkflowHandoffDto {
    return {
      Id: handoff.Id,
      CoreFlowInstanceId: handoff.CoreFlowInstanceId,
      FromStage: handoff.FromStage,
      ToStage: handoff.ToStage,
      HandoffStatus: handoff.HandoffStatus,
      BlockedReason: handoff.BlockedReason,
      ReasonCodeId: handoff.ReasonCodeId,
      ReasonNote: handoff.ReasonNote,
      Metadata: handoff.Metadata,
      OccurredAt: handoff.OccurredAt,
      CreatedBy: handoff.CreatedBy,
    };
  }
}
