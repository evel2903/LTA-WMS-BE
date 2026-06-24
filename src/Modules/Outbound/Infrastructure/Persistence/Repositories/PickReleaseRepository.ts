import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, FindOptionsWhere, In, Repository } from 'typeorm';
import { ListPickReleasesDto } from '@modules/Outbound/Application/DTOs/PickReleaseDto';
import {
  IPickReleaseRepository,
  PickReleaseAggregate,
} from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PickReleaseEntity } from '@modules/Outbound/Domain/Entities/PickReleaseEntity';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { PickReleaseStatus } from '@modules/Outbound/Domain/Enums/PickReleaseStatus';
import { OutboundOrmMapper } from '@modules/Outbound/Infrastructure/Mappers/OutboundOrmMapper';
import { PickReleaseOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickReleaseOrmEntity';
import { PickTaskOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PickTaskOrmEntity';

const ACTIVE_RELEASE_STATUSES = [PickReleaseStatus.Released, PickReleaseStatus.Blocked];

@Injectable()
export class PickReleaseRepository implements IPickReleaseRepository {
  constructor(
    @InjectRepository(PickReleaseOrmEntity)
    private readonly releases: Repository<PickReleaseOrmEntity>,
    @InjectRepository(PickTaskOrmEntity)
    private readonly tasks: Repository<PickTaskOrmEntity>,
  ) {}

  public async Create(
    release: PickReleaseEntity,
    tasks: PickTaskEntity[],
    manager?: EntityManager,
  ): Promise<PickReleaseAggregate> {
    const releaseRepo = manager ? manager.getRepository(PickReleaseOrmEntity) : this.releases;
    const taskRepo = manager ? manager.getRepository(PickTaskOrmEntity) : this.tasks;
    try {
      const savedRelease = await releaseRepo.save(OutboundOrmMapper.ToPickReleaseOrm(release));
      const savedTasks = tasks.length ? await taskRepo.save(tasks.map(OutboundOrmMapper.ToPickTaskOrm)) : [];
      return {
        Release: OutboundOrmMapper.ToPickReleaseDomain(savedRelease),
        Tasks: savedTasks.map(OutboundOrmMapper.ToPickTaskDomain).sort(this.SortTasks),
      };
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async FindById(id: string, manager?: EntityManager): Promise<PickReleaseAggregate | null> {
    const repo = manager ? manager.getRepository(PickReleaseOrmEntity) : this.releases;
    const release = await repo.findOne({ where: { Id: id } });
    if (!release) return null;
    return this.LoadAggregate(release, manager);
  }

  public async FindByIdempotencyKey(
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<PickReleaseAggregate | null> {
    const repo = manager ? manager.getRepository(PickReleaseOrmEntity) : this.releases;
    const release = await repo.findOne({ where: { IdempotencyKey: idempotencyKey } });
    if (!release) return null;
    return this.LoadAggregate(release, manager);
  }

  public async FindActiveByOutboundOrderId(
    outboundOrderId: string,
    manager?: EntityManager,
  ): Promise<PickReleaseAggregate | null> {
    const repo = manager ? manager.getRepository(PickReleaseOrmEntity) : this.releases;
    const release = await repo.findOne({
      where: { OutboundOrderId: outboundOrderId, Status: In(ACTIVE_RELEASE_STATUSES) },
      order: { CreatedAt: 'DESC' },
    });
    if (!release) return null;
    return this.LoadAggregate(release, manager);
  }

  public async ListCandidates(
    filter: Omit<ListPickReleasesDto, 'Page' | 'PageSize'>,
    manager?: EntityManager,
  ): Promise<PickReleaseAggregate[]> {
    const repo = manager ? manager.getRepository(PickReleaseOrmEntity) : this.releases;
    const where: FindOptionsWhere<PickReleaseOrmEntity> = { OutboundOrderId: filter.OutboundOrderId };
    if (filter.Status) where.Status = filter.Status;
    const items = await repo.find({ where, order: { CreatedAt: 'DESC' } });
    return Promise.all(items.map((item) => this.LoadAggregate(item, manager))).then((items) =>
      items.filter((item): item is PickReleaseAggregate => item !== null),
    );
  }

  private async LoadAggregate(release: PickReleaseOrmEntity, manager?: EntityManager): Promise<PickReleaseAggregate> {
    const taskRepo = manager ? manager.getRepository(PickTaskOrmEntity) : this.tasks;
    const tasks = await taskRepo.find({
      where: { PickReleaseId: release.Id },
      order: { Sequence: 'ASC', TaskNumber: 'ASC' },
    });
    return {
      Release: OutboundOrmMapper.ToPickReleaseDomain(release),
      Tasks: tasks.map(OutboundOrmMapper.ToPickTaskDomain).sort(this.SortTasks),
    };
  }

  private SortTasks(left: PickTaskEntity, right: PickTaskEntity): number {
    if (left.Sequence !== right.Sequence) return left.Sequence - right.Sequence;
    return left.Id.localeCompare(right.Id);
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Pick release unique constraint violated');
    }
  }
}
