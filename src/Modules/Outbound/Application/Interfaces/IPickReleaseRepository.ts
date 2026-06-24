import { EntityManager } from 'typeorm';
import { ListPickReleasesDto } from '@modules/Outbound/Application/DTOs/PickReleaseDto';
import { PickReleaseEntity } from '@modules/Outbound/Domain/Entities/PickReleaseEntity';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';

export const PICK_RELEASE_REPOSITORY = Symbol('PICK_RELEASE_REPOSITORY');

export interface PickReleaseAggregate {
  Release: PickReleaseEntity;
  Tasks: PickTaskEntity[];
}

export interface IPickReleaseRepository {
  Create(release: PickReleaseEntity, tasks: PickTaskEntity[], manager?: EntityManager): Promise<PickReleaseAggregate>;
  FindById(id: string, manager?: EntityManager): Promise<PickReleaseAggregate | null>;
  FindByIdempotencyKey(idempotencyKey: string, manager?: EntityManager): Promise<PickReleaseAggregate | null>;
  FindActiveByOutboundOrderId(outboundOrderId: string, manager?: EntityManager): Promise<PickReleaseAggregate | null>;
  ListCandidates(
    filter: Omit<ListPickReleasesDto, 'Page' | 'PageSize'>,
    manager?: EntityManager,
  ): Promise<PickReleaseAggregate[]>;
}
