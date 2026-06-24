import { EntityManager } from 'typeorm';
import { ListShipmentPackageStagingDto } from '@modules/Shipping/Application/DTOs/ShippingStagingDto';
import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';

export const SHIPPING_STAGING_REPOSITORY = Symbol('IShippingStagingRepository');

export interface IShippingStagingRepository {
  Create(entity: ShipmentPackageStagingEntity, manager?: EntityManager): Promise<ShipmentPackageStagingEntity>;
  Update(entity: ShipmentPackageStagingEntity, manager?: EntityManager): Promise<ShipmentPackageStagingEntity>;
  FindById(id: string, manager?: EntityManager): Promise<ShipmentPackageStagingEntity | null>;
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<ShipmentPackageStagingEntity | null>;
  FindByPackageId(packageId: string, manager?: EntityManager): Promise<ShipmentPackageStagingEntity | null>;
  FindByStageIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null>;
  FindByLoadingIdempotencyKey(key: string, manager?: EntityManager): Promise<ShipmentPackageStagingEntity | null>;
  FindByShipmentConfirmIdempotencyKey(
    key: string,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity | null>;
  FindByGateOutIdempotencyKey(key: string, manager?: EntityManager): Promise<ShipmentPackageStagingEntity | null>;
  FindByGoodsIssueTriggerIdempotencyKey(
    key: string,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity | null>;
  ListByShipmentReference(
    shipmentReference: string,
    scope?: {
      WarehouseId?: string | null;
      OwnerId?: string | null;
      OutboundOrderId?: string | null;
    },
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity[]>;
  List(
    skip: number,
    take: number,
    filter?: Omit<ListShipmentPackageStagingDto, 'Page' | 'PageSize'>,
  ): Promise<{ Items: ShipmentPackageStagingEntity[]; TotalItems: number }>;
}
