import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';
import { ShipmentPackageStagingOrmEntity } from '@modules/Shipping/Infrastructure/Persistence/Entities/ShipmentPackageStagingOrmEntity';

export class ShippingStagingOrmMapper {
  public static ToDomain(entity: ShipmentPackageStagingOrmEntity): ShipmentPackageStagingEntity {
    return new ShipmentPackageStagingEntity({
      Id: entity.Id,
      StagingCode: entity.StagingCode,
      PackageId: entity.PackageId,
      PackageCode: entity.PackageCode,
      OutboundOrderId: entity.OutboundOrderId,
      WarehouseProfileId: entity.WarehouseProfileId,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      Status: entity.Status as ShipmentPackageStagingStatus,
      InventoryStatusCode: entity.InventoryStatusCode,
      ShipmentReference: entity.ShipmentReference,
      StagingLaneCode: entity.StagingLaneCode,
      StagingLocationId: entity.StagingLocationId,
      StagingLocationCode: entity.StagingLocationCode,
      DockDoorId: entity.DockDoorId,
      DockDoorCode: entity.DockDoorCode,
      TruckReference: entity.TruckReference,
      VehicleNumber: entity.VehicleNumber,
      DriverName: entity.DriverName,
      CarrierId: entity.CarrierId,
      CarrierCode: entity.CarrierCode,
      CoreFlowInstanceId: entity.CoreFlowInstanceId,
      StageIdempotencyKey: entity.StageIdempotencyKey,
      StagePayloadFingerprint: entity.StagePayloadFingerprint,
      DockIdempotencyKey: entity.DockIdempotencyKey,
      DockPayloadFingerprint: entity.DockPayloadFingerprint,
      TruckIdempotencyKey: entity.TruckIdempotencyKey,
      TruckPayloadFingerprint: entity.TruckPayloadFingerprint,
      LoadingIdempotencyKey: entity.LoadingIdempotencyKey,
      LoadingPayloadFingerprint: entity.LoadingPayloadFingerprint,
      ShipmentConfirmIdempotencyKey: entity.ShipmentConfirmIdempotencyKey,
      ShipmentConfirmPayloadFingerprint: entity.ShipmentConfirmPayloadFingerprint,
      GateOutIdempotencyKey: entity.GateOutIdempotencyKey,
      GateOutPayloadFingerprint: entity.GateOutPayloadFingerprint,
      GoodsIssueTriggerIdempotencyKey: entity.GoodsIssueTriggerIdempotencyKey,
      GoodsIssueTriggerPayloadFingerprint: entity.GoodsIssueTriggerPayloadFingerprint,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      StagedAt: entity.StagedAt,
      StagedBy: entity.StagedBy,
      DockAssignedAt: entity.DockAssignedAt,
      DockAssignedBy: entity.DockAssignedBy,
      TruckAssignedAt: entity.TruckAssignedAt,
      TruckAssignedBy: entity.TruckAssignedBy,
      LoadReference: entity.LoadReference,
      LoadedAt: entity.LoadedAt,
      LoadedBy: entity.LoadedBy,
      ShipmentConfirmedAt: entity.ShipmentConfirmedAt,
      ShipmentConfirmedBy: entity.ShipmentConfirmedBy,
      GateOutReference: entity.GateOutReference,
      GateOutAt: entity.GateOutAt,
      GateOutBy: entity.GateOutBy,
      GoodsIssueTrigger: entity.GoodsIssueTrigger as never,
      GoodsIssueTriggerStatus: entity.GoodsIssueTriggerStatus as never,
      GoodsIssueTriggeredAt: entity.GoodsIssueTriggeredAt,
      GoodsIssueTriggeredBy: entity.GoodsIssueTriggeredBy,
      LoadingOutboxMessageId: entity.LoadingOutboxMessageId,
      ShipmentConfirmOutboxMessageId: entity.ShipmentConfirmOutboxMessageId,
      GateOutOutboxMessageId: entity.GateOutOutboxMessageId,
      GoodsIssueTriggerOutboxMessageId: entity.GoodsIssueTriggerOutboxMessageId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: ShipmentPackageStagingEntity): ShipmentPackageStagingOrmEntity {
    const orm = new ShipmentPackageStagingOrmEntity();
    Object.assign(orm, entity);
    orm.EvidenceRefs = entity.EvidenceRefs;
    return orm;
  }
}
