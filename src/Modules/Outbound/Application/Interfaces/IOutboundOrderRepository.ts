import { EntityManager } from 'typeorm';
import { ListOutboundOrdersDto } from '@modules/Outbound/Application/DTOs/OutboundOrderDto';
import { OutboundOrderEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';

export const OUTBOUND_ORDER_REPOSITORY = Symbol('OUTBOUND_ORDER_REPOSITORY');

export interface OutboundOrderAggregate {
  Order: OutboundOrderEntity;
  Lines: OutboundOrderLineEntity[];
}

export interface IOutboundOrderRepository {
  Create(
    order: OutboundOrderEntity,
    lines: OutboundOrderLineEntity[],
    manager?: EntityManager,
  ): Promise<OutboundOrderAggregate>;
  UpdateAggregate(
    order: OutboundOrderEntity,
    lines: OutboundOrderLineEntity[],
    manager?: EntityManager,
  ): Promise<OutboundOrderAggregate>;
  UpdateOrder(order: OutboundOrderEntity, manager?: EntityManager): Promise<OutboundOrderEntity>;
  FindById(id: string): Promise<OutboundOrderAggregate | null>;
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<OutboundOrderAggregate | null>;
  FindByBusinessKey(
    sourceSystem: string,
    sourceReference: string,
    ownerId: string,
    warehouseId: string,
  ): Promise<OutboundOrderAggregate | null>;
  FindByIdempotencyKey(idempotencyKey: string): Promise<OutboundOrderAggregate | null>;
  ListCandidates(filter?: Omit<ListOutboundOrdersDto, 'Page' | 'PageSize'>): Promise<OutboundOrderAggregate[]>;
}
