import { ShipmentPackageStagingDto } from '@modules/Shipping/Application/DTOs/ShippingStagingDto';
import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';

const date = (value: Date | null): string | null => (value ? value.toISOString() : null);

export class ShippingStagingDtoMapper {
  public static ToDto(entity: ShipmentPackageStagingEntity): ShipmentPackageStagingDto {
    return {
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
      Status: entity.Status,
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
      StagedAt: entity.StagedAt.toISOString(),
      StagedBy: entity.StagedBy,
      DockAssignedAt: date(entity.DockAssignedAt),
      DockAssignedBy: entity.DockAssignedBy,
      TruckAssignedAt: date(entity.TruckAssignedAt),
      TruckAssignedBy: entity.TruckAssignedBy,
      LoadReference: entity.LoadReference,
      LoadedAt: date(entity.LoadedAt),
      LoadedBy: entity.LoadedBy,
      ShipmentConfirmedAt: date(entity.ShipmentConfirmedAt),
      ShipmentConfirmedBy: entity.ShipmentConfirmedBy,
      LoadingOutboxMessageId: entity.LoadingOutboxMessageId,
      ShipmentConfirmOutboxMessageId: entity.ShipmentConfirmOutboxMessageId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
    };
  }
}
