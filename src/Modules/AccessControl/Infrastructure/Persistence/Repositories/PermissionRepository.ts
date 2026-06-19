import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import {
  IPermissionRepository,
  PermissionListFilter,
} from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { PermissionOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/PermissionOrmMapper';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';

@Injectable()
export class PermissionRepository implements IPermissionRepository {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly permissions: Repository<PermissionOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<PermissionEntity | null> {
    const entity = await this.permissions.findOne({ where: { Id: id } });
    return entity ? PermissionOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(permissionCode: string): Promise<PermissionEntity | null> {
    const entity = await this.permissions.findOne({ where: { PermissionCode: permissionCode } });
    return entity ? PermissionOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIds(ids: string[]): Promise<PermissionEntity[]> {
    if (ids.length === 0) return [];
    const entities = await this.permissions.find({ where: { Id: In(ids) } });
    return entities.map(PermissionOrmMapper.ToDomain);
  }

  public async Create(permission: PermissionEntity): Promise<PermissionEntity> {
    try {
      const created = await this.permissions.save(PermissionOrmMapper.ToOrm(permission));
      return PermissionOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(
    skip: number,
    take: number,
    filter: PermissionListFilter = {},
  ): Promise<{ Items: PermissionEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<PermissionOrmEntity> = {};
    if (filter.Action) where.Action = filter.Action;
    if (filter.ObjectType) where.ObjectType = filter.ObjectType;

    const [items, total] = await this.permissions.findAndCount({
      where,
      order: { ObjectType: 'ASC', Action: 'ASC' },
      skip,
      take,
    });
    return { Items: items.map(PermissionOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Permission already exists');
    }
  }
}
