import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IWarehouseProfileAssignmentRepository,
  WarehouseProfileAssignmentListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileAssignmentRepository';
import { WarehouseProfileAssignmentEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignmentEntity';
import { WarehouseProfileAssignmentOrmMapper } from '@modules/WarehouseProfile/Infrastructure/Mappers/WarehouseProfileAssignmentOrmMapper';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';

@Injectable()
export class WarehouseProfileAssignmentRepository implements IWarehouseProfileAssignmentRepository {
  constructor(
    @InjectRepository(WarehouseProfileAssignmentOrmEntity)
    private readonly assignments: Repository<WarehouseProfileAssignmentOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<WarehouseProfileAssignmentEntity | null> {
    const entity = await this.assignments.findOne({ where: { Id: id } });
    return entity ? WarehouseProfileAssignmentOrmMapper.ToDomain(entity) : null;
  }

  public async Create(assignment: WarehouseProfileAssignmentEntity): Promise<WarehouseProfileAssignmentEntity> {
    try {
      const created = await this.assignments.save(WarehouseProfileAssignmentOrmMapper.ToOrm(assignment));
      return WarehouseProfileAssignmentOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async ListByProfile(
    warehouseProfileId: string,
    skip: number,
    take: number,
    filter: WarehouseProfileAssignmentListFilter = {},
  ): Promise<{ Items: WarehouseProfileAssignmentEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<WarehouseProfileAssignmentOrmEntity> = { WarehouseProfileId: warehouseProfileId };
    if (filter.AssignmentType) where.AssignmentType = filter.AssignmentType;

    const [items, total] = await this.assignments.findAndCount({
      where,
      order: { CreatedAt: 'ASC' },
      skip,
      take,
    });

    return {
      Items: items.map(WarehouseProfileAssignmentOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Warehouse profile assignment already exists');
    }
  }
}
