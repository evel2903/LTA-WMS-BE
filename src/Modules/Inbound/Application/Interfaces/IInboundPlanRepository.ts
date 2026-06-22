import { EntityManager } from 'typeorm';
import { ListInboundPlansDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';

export const INBOUND_PLAN_REPOSITORY = Symbol('INBOUND_PLAN_REPOSITORY');

export interface InboundPlanAggregate {
  Plan: InboundPlanEntity;
  Lines: InboundPlanLineEntity[];
}

export interface IInboundPlanRepository {
  Create(
    plan: InboundPlanEntity,
    lines: InboundPlanLineEntity[],
    manager?: EntityManager,
  ): Promise<InboundPlanAggregate>;
  UpdatePlan(plan: InboundPlanEntity, manager?: EntityManager): Promise<InboundPlanEntity>;
  FindById(id: string): Promise<InboundPlanAggregate | null>;
  FindByBusinessKey(
    sourceSystem: string,
    sourceDocumentType: string,
    sourceDocumentNumber: string,
    ownerId: string,
    warehouseId: string,
  ): Promise<InboundPlanAggregate | null>;
  List(
    skip: number,
    take: number,
    filter?: Omit<ListInboundPlansDto, 'Page' | 'PageSize'>,
  ): Promise<{ Items: InboundPlanAggregate[]; TotalItems: number }>;
  FindCandidates(filter?: Omit<ListInboundPlansDto, 'Page' | 'PageSize'>): Promise<InboundPlanAggregate[]>;
}
