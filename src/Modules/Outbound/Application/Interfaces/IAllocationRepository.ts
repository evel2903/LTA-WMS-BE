import { EntityManager } from 'typeorm';
import { ListAllocationsDto } from '@modules/Outbound/Application/DTOs/AllocationDto';
import { AllocationEntity } from '@modules/Outbound/Domain/Entities/AllocationEntity';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';

export const ALLOCATION_REPOSITORY = Symbol('ALLOCATION_REPOSITORY');

export interface AllocationAggregate {
  Allocation: AllocationEntity;
  Lines: AllocationLineEntity[];
}

export interface IAllocationRepository {
  Create(
    allocation: AllocationEntity,
    lines: AllocationLineEntity[],
    manager?: EntityManager,
  ): Promise<AllocationAggregate>;
  FindById(id: string): Promise<AllocationAggregate | null>;
  FindByIdempotencyKey(idempotencyKey: string, manager?: EntityManager): Promise<AllocationAggregate | null>;
  FindActiveByOutboundOrderId(outboundOrderId: string, manager?: EntityManager): Promise<AllocationAggregate | null>;
  ListCandidates(
    filter: Omit<ListAllocationsDto, 'Page' | 'PageSize'>,
    manager?: EntityManager,
  ): Promise<AllocationAggregate[]>;
}
