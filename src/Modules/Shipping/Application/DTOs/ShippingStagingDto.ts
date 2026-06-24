import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';

export interface ShipmentPackageStagingDto {
  Id: string;
  StagingCode: string;
  PackageId: string;
  PackageCode: string;
  OutboundOrderId: string;
  WarehouseProfileId: string;
  WarehouseId: string | null;
  WarehouseCode: string | null;
  OwnerId: string | null;
  OwnerCode: string | null;
  Status: ShipmentPackageStagingStatus;
  InventoryStatusCode: string | null;
  ShipmentReference: string | null;
  StagingLaneCode: string;
  StagingLocationId: string | null;
  StagingLocationCode: string | null;
  DockDoorId: string | null;
  DockDoorCode: string | null;
  TruckReference: string | null;
  VehicleNumber: string | null;
  DriverName: string | null;
  CarrierId: string | null;
  CarrierCode: string | null;
  CoreFlowInstanceId: string | null;
  StagedAt: string;
  StagedBy: string | null;
  DockAssignedAt: string | null;
  DockAssignedBy: string | null;
  TruckAssignedAt: string | null;
  TruckAssignedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ListShipmentPackageStagingDto {
  Page?: number;
  PageSize?: number;
  WarehouseId?: string;
  OwnerId?: string;
  Status?: ShipmentPackageStagingStatus;
  PackageId?: string;
  OutboundOrderId?: string;
  ShipmentReference?: string;
}

export interface StagePackageDto {
  PackageId: string;
  ShipmentReference?: string | null;
  StagingLaneCode: string;
  StagingLocationId?: string | null;
  StagingLocationCode?: string | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  IdempotencyKey: string;
}

export interface AssignDockDto {
  DockDoorId?: string | null;
  DockDoorCode?: string | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  IdempotencyKey: string;
}

export interface AssignTruckDto {
  TruckReference?: string | null;
  VehicleNumber?: string | null;
  DriverName?: string | null;
  CarrierId?: string | null;
  CarrierCode?: string | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
  IdempotencyKey: string;
}
