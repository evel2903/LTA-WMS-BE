import { PickReleaseDto, PickTaskDto } from '@modules/Outbound/Application/DTOs/PickReleaseDto';
import { PickReleaseAggregate } from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';

export class PickReleaseDtoMapper {
  public static ToDto(aggregate: PickReleaseAggregate, isDuplicate = false): PickReleaseDto {
    const release = aggregate.Release;
    return {
      Id: release.Id,
      ReleaseNumber: release.ReleaseNumber,
      OutboundOrderId: release.OutboundOrderId,
      AllocationId: release.AllocationId,
      WarehouseId: release.WarehouseId,
      WarehouseCode: release.WarehouseCode,
      OwnerId: release.OwnerId,
      OwnerCode: release.OwnerCode,
      ReleaseMode: release.ReleaseMode,
      BatchSize: release.BatchSize,
      Status: release.Status,
      BlockReason: release.BlockReason,
      TotalTaskCount: release.TotalTaskCount,
      TotalReleasedQuantity: release.TotalReleasedQuantity,
      OutboxMessageId: release.OutboxMessageId,
      ReasonCode: release.ReasonCode,
      ReasonCodeId: release.ReasonCodeId,
      ReasonNote: release.ReasonNote,
      EvidenceRefs: release.EvidenceRefs,
      IsDuplicate: isDuplicate,
      Tasks: aggregate.Tasks.map((task) => PickReleaseDtoMapper.ToTaskDto(task)),
      CreatedAt: release.CreatedAt,
      UpdatedAt: release.UpdatedAt,
      CreatedBy: release.CreatedBy,
      UpdatedBy: release.UpdatedBy,
    };
  }

  public static ToTaskDto(task: PickTaskEntity): PickTaskDto {
    return {
      Id: task.Id,
      PickReleaseId: task.PickReleaseId,
      OutboundOrderId: task.OutboundOrderId,
      AllocationId: task.AllocationId,
      AllocationLineId: task.AllocationLineId,
      OutboundOrderLineId: task.OutboundOrderLineId,
      TaskNumber: task.TaskNumber,
      Status: task.Status,
      Sequence: task.Sequence,
      BatchNumber: task.BatchNumber,
      SourceBalanceId: task.SourceBalanceId,
      SourceDimensionId: task.SourceDimensionId,
      SourceLocationId: task.SourceLocationId,
      TargetLocationId: task.TargetLocationId,
      TargetReference: task.TargetReference,
      SkuId: task.SkuId,
      SkuCode: task.SkuCode,
      UomId: task.UomId,
      UomCode: task.UomCode,
      Quantity: task.Quantity,
      InventoryStatusCode: task.InventoryStatusCode,
      LotNumber: task.LotNumber,
      SerialNumber: task.SerialNumber,
      ExpiryDate: task.ExpiryDate,
      CompletedAt: task.CompletedAt,
      CompletedBy: task.CompletedBy,
      ConfirmIdempotencyKey: task.ConfirmIdempotencyKey,
      ConfirmOutboxMessageId: task.ConfirmOutboxMessageId,
      ConfirmInventoryTransactionId: task.ConfirmInventoryTransactionId,
      CreatedAt: task.CreatedAt,
    };
  }
}
