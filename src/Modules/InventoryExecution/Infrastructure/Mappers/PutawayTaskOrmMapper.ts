import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { PutawayTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/PutawayTaskOrmEntity';

export class PutawayTaskOrmMapper {
  public static ToDomain(entity: PutawayTaskOrmEntity): PutawayTaskEntity {
    return new PutawayTaskEntity({
      Id: entity.Id,
      TaskCode: entity.TaskCode,
      TaskStatus: entity.TaskStatus,
      InboundPutawayReleaseId: entity.InboundPutawayReleaseId,
      ReceiptId: entity.ReceiptId,
      ReceiptLineId: entity.ReceiptLineId,
      InboundPlanId: entity.InboundPlanId,
      InboundPlanLineId: entity.InboundPlanLineId,
      InboundLpnId: entity.InboundLpnId,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      Quantity: Number(entity.Quantity),
      LpnCode: entity.LpnCode,
      SsccCode: entity.SsccCode,
      InventoryStatusCode: entity.InventoryStatusCode,
      SourceLocationId: entity.SourceLocationId,
      SourceLocationCode: entity.SourceLocationCode,
      TargetLocationId: entity.TargetLocationId,
      TargetLocationCode: entity.TargetLocationCode,
      TargetLocationProfileId: entity.TargetLocationProfileId,
      Priority: entity.Priority,
      WorkPoolCode: entity.WorkPoolCode,
      AssignedUserId: entity.AssignedUserId,
      ConstraintJson: entity.ConstraintJson,
      EligibilityDecisionJson: entity.EligibilityDecisionJson,
      OutboxMessageId: entity.OutboxMessageId,
      MobileTaskId: entity.MobileTaskId,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      IdempotencyKey: entity.IdempotencyKey,
      ReleasedAt: entity.ReleasedAt,
      ReleasedBy: entity.ReleasedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToOrm(entity: PutawayTaskEntity): PutawayTaskOrmEntity {
    const orm = new PutawayTaskOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
