import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { IDataScopeRepository, PrincipalRef } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';
import { DataScopeOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/DataScopeOrmMapper';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';

@Injectable()
export class DataScopeRepository implements IDataScopeRepository {
  constructor(
    @InjectRepository(DataScopeOrmEntity)
    private readonly scopes: Repository<DataScopeOrmEntity>,
  ) {}

  public async FindByPrincipal(principalType: PrincipalType, principalId: string): Promise<DataScopeEntity[]> {
    const entities = await this.scopes.find({ where: { PrincipalType: principalType, PrincipalId: principalId } });
    return entities.map(DataScopeOrmMapper.ToDomain);
  }

  public async FindByPrincipals(refs: PrincipalRef[]): Promise<DataScopeEntity[]> {
    if (refs.length === 0) return [];
    const query = this.scopes.createQueryBuilder('scope');
    refs.forEach((ref, index) => {
      const condition = 'scope.PrincipalType = :type' + index + ' AND scope.PrincipalId = :id' + index;
      const params = { ['type' + index]: ref.Type, ['id' + index]: ref.Id };
      if (index === 0) {
        query.where(new Brackets((qb) => qb.where(condition, params)));
      } else {
        query.orWhere(new Brackets((qb) => qb.where(condition, params)));
      }
    });
    const entities = await query.getMany();
    return entities.map(DataScopeOrmMapper.ToDomain);
  }

  public async Create(scope: DataScopeEntity, manager?: EntityManager): Promise<DataScopeEntity> {
    const repo = manager ? manager.getRepository(DataScopeOrmEntity) : this.scopes;
    try {
      const created = await repo.save(DataScopeOrmMapper.ToOrm(scope));
      return DataScopeOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Delete(id: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(DataScopeOrmEntity) : this.scopes;
    await repo.delete({ Id: id });
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Data scope already exists for this principal');
    }
  }
}
