import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { RoleOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/RoleOrmMapper';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly roles: Repository<RoleOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<RoleEntity | null> {
    const entity = await this.roles.findOne({ where: { Id: id } });
    return entity ? RoleOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIdForUpdate(id: string, manager: EntityManager): Promise<RoleEntity | null> {
    const entity = await manager
      .getRepository(RoleOrmEntity)
      .findOne({ where: { Id: id }, lock: { mode: 'pessimistic_write' } });
    return entity ? RoleOrmMapper.ToDomain(entity) : null;
  }

  public async FindByCode(roleCode: string): Promise<RoleEntity | null> {
    const entity = await this.roles.findOne({ where: { RoleCode: roleCode } });
    return entity ? RoleOrmMapper.ToDomain(entity) : null;
  }

  public async FindByIds(ids: string[]): Promise<RoleEntity[]> {
    if (ids.length === 0) return [];
    const entities = await this.roles.find({ where: { Id: In(ids) } });
    return entities.map(RoleOrmMapper.ToDomain);
  }

  public async Create(role: RoleEntity, manager?: EntityManager): Promise<RoleEntity> {
    const repo = manager ? manager.getRepository(RoleOrmEntity) : this.roles;
    try {
      const created = await repo.save(RoleOrmMapper.ToOrm(role));
      return RoleOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Update(role: RoleEntity, manager?: EntityManager): Promise<RoleEntity> {
    const repo = manager ? manager.getRepository(RoleOrmEntity) : this.roles;
    try {
      const updated = await repo.save(RoleOrmMapper.ToOrm(role));
      return RoleOrmMapper.ToDomain(updated);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async List(skip: number, take: number): Promise<{ Items: RoleEntity[]; TotalItems: number }> {
    const [items, total] = await this.roles.findAndCount({
      order: { RoleCode: 'ASC' },
      skip,
      take,
    });
    return { Items: items.map(RoleOrmMapper.ToDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Role code already exists');
    }
  }
}
