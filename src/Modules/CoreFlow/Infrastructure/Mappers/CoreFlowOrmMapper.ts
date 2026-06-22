import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowHandoffStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowHandoffStatus';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';

export class CoreFlowOrmMapper {
  public static InstanceToDomain(entity: CoreFlowInstanceOrmEntity): CoreFlowInstanceEntity {
    return new CoreFlowInstanceEntity({
      Id: entity.Id,
      BusinessReference: entity.BusinessReference,
      SourceSystem: entity.SourceSystem,
      WarehouseCode: entity.WarehouseCode,
      OwnerCode: entity.OwnerCode,
      CorrelationId: entity.CorrelationId,
      CurrentStage: entity.CurrentStage as CoreFlowStageCode,
      Status: entity.Status as CoreFlowInstanceStatus,
      Metadata: entity.Metadata,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static InstanceToOrm(entity: CoreFlowInstanceEntity): CoreFlowInstanceOrmEntity {
    const orm = new CoreFlowInstanceOrmEntity();
    orm.Id = entity.Id;
    orm.BusinessReference = entity.BusinessReference;
    orm.SourceSystem = entity.SourceSystem;
    orm.WarehouseCode = entity.WarehouseCode;
    orm.OwnerCode = entity.OwnerCode;
    orm.CorrelationId = entity.CorrelationId;
    orm.CurrentStage = entity.CurrentStage;
    orm.Status = entity.Status;
    orm.Metadata = entity.Metadata;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }

  public static MilestoneToDomain(entity: WorkflowMilestoneOrmEntity): WorkflowMilestoneEntity {
    return new WorkflowMilestoneEntity({
      Id: entity.Id,
      CoreFlowInstanceId: entity.CoreFlowInstanceId,
      StageCode: entity.StageCode as CoreFlowStageCode,
      StepCode: entity.StepCode as CoreFlowStepCode,
      MilestoneStatus: entity.MilestoneStatus as WorkflowMilestoneStatus,
      InventoryStatusCode: entity.InventoryStatusCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      ExceptionCaseId: entity.ExceptionCaseId,
      Metadata: entity.Metadata,
      OccurredAt: entity.OccurredAt,
      CreatedBy: entity.CreatedBy,
    });
  }

  public static MilestoneToOrm(entity: WorkflowMilestoneEntity): WorkflowMilestoneOrmEntity {
    const orm = new WorkflowMilestoneOrmEntity();
    orm.Id = entity.Id;
    orm.CoreFlowInstanceId = entity.CoreFlowInstanceId;
    orm.StageCode = entity.StageCode;
    orm.StepCode = entity.StepCode;
    orm.MilestoneStatus = entity.MilestoneStatus;
    orm.InventoryStatusCode = entity.InventoryStatusCode;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.ReasonNote = entity.ReasonNote;
    orm.ExceptionCaseId = entity.ExceptionCaseId;
    orm.Metadata = entity.Metadata;
    orm.OccurredAt = entity.OccurredAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }

  public static HandoffToDomain(entity: WorkflowHandoffOrmEntity): WorkflowHandoffEntity {
    return new WorkflowHandoffEntity({
      Id: entity.Id,
      CoreFlowInstanceId: entity.CoreFlowInstanceId,
      FromStage: entity.FromStage as CoreFlowStageCode,
      ToStage: entity.ToStage as CoreFlowStageCode,
      HandoffStatus: entity.HandoffStatus as WorkflowHandoffStatus,
      BlockedReason: entity.BlockedReason,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      Metadata: entity.Metadata,
      OccurredAt: entity.OccurredAt,
      CreatedBy: entity.CreatedBy,
    });
  }

  public static HandoffToOrm(entity: WorkflowHandoffEntity): WorkflowHandoffOrmEntity {
    const orm = new WorkflowHandoffOrmEntity();
    orm.Id = entity.Id;
    orm.CoreFlowInstanceId = entity.CoreFlowInstanceId;
    orm.FromStage = entity.FromStage;
    orm.ToStage = entity.ToStage;
    orm.HandoffStatus = entity.HandoffStatus;
    orm.BlockedReason = entity.BlockedReason;
    orm.ReasonCodeId = entity.ReasonCodeId;
    orm.ReasonNote = entity.ReasonNote;
    orm.Metadata = entity.Metadata;
    orm.OccurredAt = entity.OccurredAt;
    orm.CreatedBy = entity.CreatedBy;
    return orm;
  }
}
