import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ListShipmentPackageStagingDto } from '@modules/Shipping/Application/DTOs/ShippingStagingDto';
import { IShippingStagingRepository } from '@modules/Shipping/Application/Interfaces/IShippingStagingRepository';
import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';
import { ShippingStagingOrmMapper } from '@modules/Shipping/Infrastructure/Mappers/ShippingStagingOrmMapper';
import { ShipmentPackageStagingOrmEntity } from '@modules/Shipping/Infrastructure/Persistence/Entities/ShipmentPackageStagingOrmEntity';

@Injectable()
export class ShippingStagingRepository implements IShippingStagingRepository {
  constructor(
    @InjectRepository(ShipmentPackageStagingOrmEntity)
    private readonly stagings: Repository<ShipmentPackageStagingOrmEntity>,
  ) {}

  public async Create(
    entity: ShipmentPackageStagingEntity,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity> {
    const saved = await this.Repo(manager).save(ShippingStagingOrmMapper.ToOrm(entity));
    return ShippingStagingOrmMapper.ToDomain(saved);
  }

  public async Update(
    entity: ShipmentPackageStagingEntity,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity> {
    const saved = await this.Repo(manager).save(ShippingStagingOrmMapper.ToOrm(entity));
    return ShippingStagingOrmMapper.ToDomain(saved);
  }

  public async FindById(id: string, manager?: EntityManager): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await this.Repo(manager).findOne({ where: { Id: id } });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await manager.getRepository(ShipmentPackageStagingOrmEntity).findOne({
      where: { Id: id },
      lock: { mode: 'pessimistic_write' },
    });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async FindByPackageId(
    packageId: string,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await this.Repo(manager).findOne({ where: { PackageId: packageId } });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async FindByStageIdempotencyKey(key: string): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await this.stagings.findOne({ where: { StageIdempotencyKey: key } });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async FindByLoadingIdempotencyKey(
    key: string,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await this.Repo(manager).findOne({ where: { LoadingIdempotencyKey: key } });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async FindByShipmentConfirmIdempotencyKey(
    key: string,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await this.Repo(manager).findOne({ where: { ShipmentConfirmIdempotencyKey: key } });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async FindByGateOutIdempotencyKey(
    key: string,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await this.Repo(manager).findOne({ where: { GateOutIdempotencyKey: key } });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async FindByGoodsIssueTriggerIdempotencyKey(
    key: string,
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity | null> {
    const entity = await this.Repo(manager).findOne({ where: { GoodsIssueTriggerIdempotencyKey: key } });
    return entity ? ShippingStagingOrmMapper.ToDomain(entity) : null;
  }

  public async ListByShipmentReference(
    shipmentReference: string,
    scope: {
      WarehouseId?: string | null;
      OwnerId?: string | null;
      OutboundOrderId?: string | null;
    } = {},
    manager?: EntityManager,
  ): Promise<ShipmentPackageStagingEntity[]> {
    const where: FindOptionsWhere<ShipmentPackageStagingOrmEntity> = { ShipmentReference: shipmentReference };
    if (scope.WarehouseId) where.WarehouseId = scope.WarehouseId;
    if (scope.OwnerId) where.OwnerId = scope.OwnerId;
    if (scope.OutboundOrderId) where.OutboundOrderId = scope.OutboundOrderId;
    const items = await this.Repo(manager).find({
      where,
      lock: manager ? { mode: 'pessimistic_write' } : undefined,
      order: { CreatedAt: 'ASC' },
    });
    return items.map(ShippingStagingOrmMapper.ToDomain);
  }

  public async List(
    skip: number,
    take: number,
    filter: Omit<ListShipmentPackageStagingDto, 'Page' | 'PageSize'> = {},
  ): Promise<{ Items: ShipmentPackageStagingEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<ShipmentPackageStagingOrmEntity> = {};
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.Status) where.Status = filter.Status;
    if (filter.PackageId) where.PackageId = filter.PackageId;
    if (filter.OutboundOrderId) where.OutboundOrderId = filter.OutboundOrderId;
    if (filter.ShipmentReference) where.ShipmentReference = filter.ShipmentReference;

    const [items, total] = await this.stagings.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(ShippingStagingOrmMapper.ToDomain), TotalItems: total };
  }

  private Repo(manager?: EntityManager): Repository<ShipmentPackageStagingOrmEntity> {
    return manager ? manager.getRepository(ShipmentPackageStagingOrmEntity) : this.stagings;
  }
}
