import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import {
  IPackDefinitionRepository,
  PackDefinitionListFilter,
} from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { PackDefinitionOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/PackDefinitionOrmMapper';
import { PackDefinitionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/PackDefinitionOrmEntity';

@Injectable()
export class PackDefinitionRepository implements IPackDefinitionRepository {
  constructor(
    @InjectRepository(PackDefinitionOrmEntity)
    private readonly packDefinitions: Repository<PackDefinitionOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<PackDefinitionEntity | null> {
    const entity = await this.packDefinitions.findOne({ where: { Id: id } });
    return entity ? PackDefinitionOrmMapper.ToDomain(entity) : null;
  }

  public async FindBySkuAndPackCode(skuId: string, packCode: string): Promise<PackDefinitionEntity | null> {
    const entity = await this.packDefinitions.findOne({ where: { SkuId: skuId, PackCode: packCode } });
    return entity ? PackDefinitionOrmMapper.ToDomain(entity) : null;
  }

  public async FindActiveDefaultBySkuId(skuId: string): Promise<PackDefinitionEntity | null> {
    const entity = await this.packDefinitions.findOne({
      where: { SkuId: skuId, IsDefault: true, Status: MasterDataStatus.Active },
    });
    return entity ? PackDefinitionOrmMapper.ToDomain(entity) : null;
  }

  public async Create(packDefinition: PackDefinitionEntity): Promise<PackDefinitionEntity> {
    try {
      const created = await this.packDefinitions.save(PackDefinitionOrmMapper.ToOrm(packDefinition));
      return PackDefinitionOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(packDefinition: PackDefinitionEntity): Promise<PackDefinitionEntity> {
    try {
      const updated = await this.packDefinitions.save(PackDefinitionOrmMapper.ToOrm(packDefinition));
      return PackDefinitionOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: PackDefinitionListFilter = {},
  ): Promise<{ Items: PackDefinitionEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<PackDefinitionOrmEntity> = {};
    if (filter.SkuId) where.SkuId = filter.SkuId;
    if (filter.UomId) where.UomId = filter.UomId;
    if (filter.PackCode) where.PackCode = filter.PackCode;
    if (filter.Status) where.Status = filter.Status;

    const [items, total] = await this.packDefinitions.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return { Items: items.map(PackDefinitionOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Pack definition unique constraint violated');
    }
  }
}
