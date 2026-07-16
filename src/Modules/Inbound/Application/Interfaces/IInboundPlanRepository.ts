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
  // IFB-24 review fix: locked read (pessimistic_write) for Confirm/Cancel/Update's
  // guard-then-mutate transaction -- closes the race where two concurrent requests
  // both read Status=Draft before either commits (mirrors IRoleRepository.FindByIdForUpdate,
  // the same pattern already established for this exact class of bug in RA-02).
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<InboundPlanAggregate | null>;
  // IFB-24: full replace (delete-then-insert) -- InboundPlanLineEntity has no
  // mutators and a Draft plan has no receipt-line/QC/etc FK referencing its
  // lines yet, so incremental per-line diffing has no payoff over a clean swap.
  ReplaceLines(
    planId: string,
    lines: InboundPlanLineEntity[],
    manager?: EntityManager,
  ): Promise<InboundPlanLineEntity[]>;
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
