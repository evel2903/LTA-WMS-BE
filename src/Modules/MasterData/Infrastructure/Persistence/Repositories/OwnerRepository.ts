import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { IOwnerRepository, OwnerListFilter } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { OwnerOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/OwnerOrmMapper';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';

@Injectable()
export class OwnerRepository implements IOwnerRepository {
  constructor(
    @InjectRepository(OwnerOrmEntity)
    private readonly owners: Repository<OwnerOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<OwnerEntity | null> {
    const entity = await this.owners.findOne({ where: { Id: id } });
    return entity ? OwnerOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(ownerCode: string): Promise<OwnerEntity | null> {
    const entity = await this.owners.findOne({ where: { OwnerCode: ownerCode } });
    return entity ? OwnerOrmMapper.ToDomain(entity) : null;
  }

  public async Create(owner: OwnerEntity): Promise<OwnerEntity> {
    try {
      const created = await this.owners.save(OwnerOrmMapper.ToOrm(owner));
      return OwnerOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(owner: OwnerEntity): Promise<OwnerEntity> {
    try {
      const updated = await this.owners.save(OwnerOrmMapper.ToOrm(owner));
      return OwnerOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: OwnerListFilter = {},
  ): Promise<{ Items: OwnerEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<OwnerOrmEntity> = {};
    if (filter.OwnerCode) where.OwnerCode = filter.OwnerCode;
    if (filter.OwnerName) where.OwnerName = filter.OwnerName;
    if (filter.Status) where.Status = filter.Status;

    const [items, total] = await this.owners.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(OwnerOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Owner code already exists');
    }
  }
}
