import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, FindOptionsWhere, In, Repository } from 'typeorm';
import { ListAllocationsDto } from '@modules/Outbound/Application/DTOs/AllocationDto';
import {
  AllocationAggregate,
  IAllocationRepository,
} from '@modules/Outbound/Application/Interfaces/IAllocationRepository';
import { AllocationEntity } from '@modules/Outbound/Domain/Entities/AllocationEntity';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { OutboundOrmMapper } from '@modules/Outbound/Infrastructure/Mappers/OutboundOrmMapper';
import { AllocationLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationLineOrmEntity';
import { AllocationOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationOrmEntity';

const ACTIVE_ALLOCATION_STATUSES = [
  AllocationStatus.Allocated,
  AllocationStatus.PartiallyAllocated,
  AllocationStatus.Backordered,
];

@Injectable()
export class AllocationRepository implements IAllocationRepository {
  constructor(
    @InjectRepository(AllocationOrmEntity)
    private readonly allocations: Repository<AllocationOrmEntity>,
    @InjectRepository(AllocationLineOrmEntity)
    private readonly lines: Repository<AllocationLineOrmEntity>,
  ) {}

  public async Create(
    allocation: AllocationEntity,
    lines: AllocationLineEntity[],
    manager?: EntityManager,
  ): Promise<AllocationAggregate> {
    const allocationRepo = manager ? manager.getRepository(AllocationOrmEntity) : this.allocations;
    const lineRepo = manager ? manager.getRepository(AllocationLineOrmEntity) : this.lines;
    try {
      const savedAllocation = await allocationRepo.save(OutboundOrmMapper.ToAllocationOrm(allocation));
      const savedLines = await lineRepo.save(lines.map(OutboundOrmMapper.ToAllocationLineOrm));
      return {
        Allocation: OutboundOrmMapper.ToAllocationDomain(savedAllocation),
        Lines: savedLines.map(OutboundOrmMapper.ToAllocationLineDomain).sort(this.SortLines),
      };
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async FindById(id: string): Promise<AllocationAggregate | null> {
    const allocation = await this.allocations.findOne({ where: { Id: id } });
    if (!allocation) return null;
    return this.LoadAggregate(allocation);
  }

  public async FindByIdempotencyKey(
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<AllocationAggregate | null> {
    const repo = manager ? manager.getRepository(AllocationOrmEntity) : this.allocations;
    const allocation = await repo.findOne({ where: { IdempotencyKey: idempotencyKey } });
    if (!allocation) return null;
    return this.LoadAggregate(allocation, manager);
  }

  public async FindActiveByOutboundOrderId(
    outboundOrderId: string,
    manager?: EntityManager,
  ): Promise<AllocationAggregate | null> {
    const repo = manager ? manager.getRepository(AllocationOrmEntity) : this.allocations;
    const allocation = await repo.findOne({
      where: { OutboundOrderId: outboundOrderId, Status: In(ACTIVE_ALLOCATION_STATUSES) },
      order: { CreatedAt: 'DESC' },
    });
    if (!allocation) return null;
    return this.LoadAggregate(allocation, manager);
  }

  public async ListCandidates(
    filter: Omit<ListAllocationsDto, 'Page' | 'PageSize'>,
    manager?: EntityManager,
  ): Promise<AllocationAggregate[]> {
    const repo = manager ? manager.getRepository(AllocationOrmEntity) : this.allocations;
    const where: FindOptionsWhere<AllocationOrmEntity> = { OutboundOrderId: filter.OutboundOrderId };
    if (filter.Status) where.Status = filter.Status;
    const items = await repo.find({ where, order: { CreatedAt: 'DESC' } });
    return Promise.all(items.map((item) => this.LoadAggregate(item, manager))).then((items) =>
      items.filter((item): item is AllocationAggregate => item !== null),
    );
  }

  private async LoadAggregate(allocation: AllocationOrmEntity, manager?: EntityManager): Promise<AllocationAggregate> {
    const lineRepo = manager ? manager.getRepository(AllocationLineOrmEntity) : this.lines;
    const lines = await lineRepo.find({ where: { AllocationId: allocation.Id }, order: { LineNumber: 'ASC' } });
    return {
      Allocation: OutboundOrmMapper.ToAllocationDomain(allocation),
      Lines: lines.map(OutboundOrmMapper.ToAllocationLineDomain).sort(this.SortLines),
    };
  }

  private SortLines(left: AllocationLineEntity, right: AllocationLineEntity): number {
    if (left.LineNumber !== right.LineNumber) return left.LineNumber - right.LineNumber;
    return left.Id.localeCompare(right.Id);
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Allocation unique constraint violated');
    }
  }
}
