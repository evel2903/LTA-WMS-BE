import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  CycleCountWorkListFilter,
  ICycleCountWorkRepository,
} from '@modules/InventoryExecution/Application/Interfaces/ICycleCountWorkRepository';
import { CycleCountWorkEntity } from '@modules/InventoryExecution/Domain/Entities/CycleCountWorkEntity';
import { CycleCountWorkOrmMapper } from '@modules/InventoryExecution/Infrastructure/Mappers/CycleCountWorkOrmMapper';
import { CycleCountWorkOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/CycleCountWorkOrmEntity';

@Injectable()
export class CycleCountWorkRepository implements ICycleCountWorkRepository {
  constructor(
    @InjectRepository(CycleCountWorkOrmEntity)
    private readonly cycleCountWorks: Repository<CycleCountWorkOrmEntity>,
  ) {}

  public async Create(work: CycleCountWorkEntity, manager?: EntityManager): Promise<CycleCountWorkEntity> {
    const repo = manager ? manager.getRepository(CycleCountWorkOrmEntity) : this.cycleCountWorks;
    try {
      const saved = await repo.save(CycleCountWorkOrmMapper.ToOrm(work));
      return CycleCountWorkOrmMapper.ToDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(work: CycleCountWorkEntity, manager?: EntityManager): Promise<CycleCountWorkEntity> {
    const repo = manager ? manager.getRepository(CycleCountWorkOrmEntity) : this.cycleCountWorks;
    try {
      const saved = await repo.save(CycleCountWorkOrmMapper.ToOrm(work));
      return CycleCountWorkOrmMapper.ToDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async FindById(id: string, manager?: EntityManager): Promise<CycleCountWorkEntity | null> {
    const repo = manager ? manager.getRepository(CycleCountWorkOrmEntity) : this.cycleCountWorks;
    const entity = await repo.findOne({ where: { Id: id } });
    return entity ? CycleCountWorkOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<CycleCountWorkEntity | null> {
    const entity = await manager
      .getRepository(CycleCountWorkOrmEntity)
      .findOne({ where: { Id: id }, lock: { mode: 'pessimistic_write' } });
    return entity ? CycleCountWorkOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCreateIdempotencyKey(
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<CycleCountWorkEntity | null> {
    const repo = manager ? manager.getRepository(CycleCountWorkOrmEntity) : this.cycleCountWorks;
    const entity = await repo.findOne({ where: { CreateIdempotencyKey: idempotencyKey } });
    return entity ? CycleCountWorkOrmMapper.ToDomain(entity) : null;
  }

  public async List(
    skip: number,
    take: number,
    filter: CycleCountWorkListFilter = {},
  ): Promise<{ Items: CycleCountWorkEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<CycleCountWorkOrmEntity> = {};
    if (filter.WarehouseId) where.WarehouseId = filter.WarehouseId;
    if (filter.OwnerId) where.OwnerId = filter.OwnerId;
    if (filter.WorkStatus) where.WorkStatus = filter.WorkStatus;
    const [items, total] = await this.cycleCountWorks.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(CycleCountWorkOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Cycle count work unique constraint violated');
    }
  }
}
