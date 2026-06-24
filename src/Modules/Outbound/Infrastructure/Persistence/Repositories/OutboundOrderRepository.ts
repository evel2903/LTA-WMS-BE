import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ListOutboundOrdersDto } from '@modules/Outbound/Application/DTOs/OutboundOrderDto';
import {
  IOutboundOrderRepository,
  OutboundOrderAggregate,
} from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { OutboundOrderEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { OutboundOrmMapper } from '@modules/Outbound/Infrastructure/Mappers/OutboundOrmMapper';
import { OutboundOrderOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderOrmEntity';
import { OutboundOrderLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderLineOrmEntity';

@Injectable()
export class OutboundOrderRepository implements IOutboundOrderRepository {
  constructor(
    @InjectRepository(OutboundOrderOrmEntity)
    private readonly orders: Repository<OutboundOrderOrmEntity>,
    @InjectRepository(OutboundOrderLineOrmEntity)
    private readonly lines: Repository<OutboundOrderLineOrmEntity>,
  ) {}

  public async Create(
    order: OutboundOrderEntity,
    lines: OutboundOrderLineEntity[],
    manager?: EntityManager,
  ): Promise<OutboundOrderAggregate> {
    const orderRepo = manager ? manager.getRepository(OutboundOrderOrmEntity) : this.orders;
    const lineRepo = manager ? manager.getRepository(OutboundOrderLineOrmEntity) : this.lines;
    try {
      const savedOrder = await orderRepo.save(OutboundOrmMapper.ToOrderOrm(order));
      const savedLines = await lineRepo.save(lines.map(OutboundOrmMapper.ToLineOrm));
      return {
        Order: OutboundOrmMapper.ToOrderDomain(savedOrder),
        Lines: savedLines.map(OutboundOrmMapper.ToLineDomain),
      };
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async UpdateAggregate(
    order: OutboundOrderEntity,
    lines: OutboundOrderLineEntity[],
    manager?: EntityManager,
  ): Promise<OutboundOrderAggregate> {
    const orderRepo = manager ? manager.getRepository(OutboundOrderOrmEntity) : this.orders;
    const lineRepo = manager ? manager.getRepository(OutboundOrderLineOrmEntity) : this.lines;
    try {
      const savedOrder = await orderRepo.save(OutboundOrmMapper.ToOrderOrm(order));
      const savedLines = await lineRepo.save(lines.map(OutboundOrmMapper.ToLineOrm));
      return {
        Order: OutboundOrmMapper.ToOrderDomain(savedOrder),
        Lines: savedLines.map(OutboundOrmMapper.ToLineDomain).sort((left, right) => left.LineNumber - right.LineNumber),
      };
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async UpdateOrder(order: OutboundOrderEntity, manager?: EntityManager): Promise<OutboundOrderEntity> {
    const repo = manager ? manager.getRepository(OutboundOrderOrmEntity) : this.orders;
    try {
      const saved = await repo.save(OutboundOrmMapper.ToOrderOrm(order));
      return OutboundOrmMapper.ToOrderDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async FindById(id: string): Promise<OutboundOrderAggregate | null> {
    const order = await this.orders.findOne({ where: { Id: id } });
    if (!order) return null;
    return this.LoadAggregate(order);
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<OutboundOrderAggregate | null> {
    const order = await manager.getRepository(OutboundOrderOrmEntity).findOne({
      where: { Id: id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) return null;
    return this.LoadAggregate(order, manager);
  }

  public async FindByBusinessKey(
    sourceSystem: string,
    sourceReference: string,
    ownerId: string,
    warehouseId: string,
  ): Promise<OutboundOrderAggregate | null> {
    const order = await this.orders.findOne({
      where: {
        SourceSystem: sourceSystem,
        SourceReference: sourceReference,
        OwnerId: ownerId,
        WarehouseId: warehouseId,
      },
    });
    if (!order) return null;
    return this.LoadAggregate(order);
  }

  public async FindByIdempotencyKey(idempotencyKey: string): Promise<OutboundOrderAggregate | null> {
    const order = await this.orders.findOne({ where: { ImportIdempotencyKey: idempotencyKey } });
    if (!order) return null;
    return this.LoadAggregate(order);
  }

  public async ListCandidates(
    filter: Omit<ListOutboundOrdersDto, 'Page' | 'PageSize'> = {},
  ): Promise<OutboundOrderAggregate[]> {
    const where = this.BuildWhere(filter);
    const orders = await this.orders.find({ where, order: { CreatedAt: 'DESC' } });
    const ids = orders.map((order) => order.Id);
    const lines = ids.length ? await this.lines.find({ where: ids.map((id) => ({ OutboundOrderId: id })) }) : [];
    return orders.map((order) => ({
      Order: OutboundOrmMapper.ToOrderDomain(order),
      Lines: lines
        .filter((line) => line.OutboundOrderId === order.Id)
        .sort((left, right) => left.LineNumber - right.LineNumber)
        .map(OutboundOrmMapper.ToLineDomain),
    }));
  }

  private async LoadAggregate(order: OutboundOrderOrmEntity, manager?: EntityManager): Promise<OutboundOrderAggregate> {
    const lineRepo = manager ? manager.getRepository(OutboundOrderLineOrmEntity) : this.lines;
    const lines = await lineRepo.find({ where: { OutboundOrderId: order.Id }, order: { LineNumber: 'ASC' } });
    return {
      Order: OutboundOrmMapper.ToOrderDomain(order),
      Lines: lines.map(OutboundOrmMapper.ToLineDomain),
    };
  }

  private BuildWhere(
    filter: Omit<ListOutboundOrdersDto, 'Page' | 'PageSize'>,
  ): FindOptionsWhere<OutboundOrderOrmEntity> {
    const where: FindOptionsWhere<OutboundOrderOrmEntity> = {};
    if (filter.SourceSystem) where.SourceSystem = filter.SourceSystem;
    if (filter.SourceReference) where.SourceReference = filter.SourceReference;
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.CustomerId) where.CustomerId = filter.CustomerId;
    if (filter.DocumentStatus) where.DocumentStatus = filter.DocumentStatus;
    return where;
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Outbound order unique constraint violated');
    }
  }
}
