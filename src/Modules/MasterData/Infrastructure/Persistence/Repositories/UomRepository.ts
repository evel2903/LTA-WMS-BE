import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { IUomRepository, UomListFilter } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { UomOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/UomOrmMapper';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';

@Injectable()
export class UomRepository implements IUomRepository {
  constructor(
    @InjectRepository(UomOrmEntity)
    private readonly uoms: Repository<UomOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<UomEntity | null> {
    const entity = await this.uoms.findOne({ where: { Id: id } });
    return entity ? UomOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(uomCode: string): Promise<UomEntity | null> {
    const entity = await this.uoms.findOne({ where: { UomCode: uomCode } });
    return entity ? UomOrmMapper.ToDomain(entity) : null;
  }

  public async Create(uom: UomEntity): Promise<UomEntity> {
    try {
      const created = await this.uoms.save(UomOrmMapper.ToOrm(uom));
      return UomOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(uom: UomEntity): Promise<UomEntity> {
    try {
      const updated = await this.uoms.save(UomOrmMapper.ToOrm(uom));
      return UomOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: UomListFilter = {},
  ): Promise<{ Items: UomEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<UomOrmEntity> = {};
    if (filter.UomCode) where.UomCode = filter.UomCode;
    if (filter.UomName) where.UomName = filter.UomName;
    if (filter.UomType) where.UomType = filter.UomType;
    if (filter.Status) where.Status = filter.Status;

    const [items, total] = await this.uoms.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(UomOrmMapper.ToDomain),
      TotalItems: total,
    };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('UOM code already exists');
    }
  }
}
