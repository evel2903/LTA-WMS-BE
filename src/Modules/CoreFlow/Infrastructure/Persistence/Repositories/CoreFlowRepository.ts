import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import {
  ICoreFlowRepository,
  WorkflowMilestoneListFilter,
} from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowOrmMapper } from '@modules/CoreFlow/Infrastructure/Mappers/CoreFlowOrmMapper';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';

@Injectable()
export class CoreFlowRepository implements ICoreFlowRepository {
  constructor(
    @InjectRepository(CoreFlowInstanceOrmEntity)
    private readonly instances: Repository<CoreFlowInstanceOrmEntity>,
    @InjectRepository(WorkflowMilestoneOrmEntity)
    private readonly milestones: Repository<WorkflowMilestoneOrmEntity>,
    @InjectRepository(WorkflowHandoffOrmEntity)
    private readonly handoffs: Repository<WorkflowHandoffOrmEntity>,
  ) {}

  public async CreateInstance(
    instance: CoreFlowInstanceEntity,
    manager?: EntityManager,
  ): Promise<CoreFlowInstanceEntity> {
    const repo = manager ? manager.getRepository(CoreFlowInstanceOrmEntity) : this.instances;
    const created = await repo.save(CoreFlowOrmMapper.InstanceToOrm(instance));
    return CoreFlowOrmMapper.InstanceToDomain(created);
  }

  public async UpdateInstance(
    instance: CoreFlowInstanceEntity,
    manager?: EntityManager,
  ): Promise<CoreFlowInstanceEntity> {
    const repo = manager ? manager.getRepository(CoreFlowInstanceOrmEntity) : this.instances;
    const updated = await repo.save(CoreFlowOrmMapper.InstanceToOrm(instance));
    return CoreFlowOrmMapper.InstanceToDomain(updated);
  }

  public async FindInstanceById(id: string): Promise<CoreFlowInstanceEntity | null> {
    const entity = await this.instances.findOne({ where: { Id: id } });
    return entity ? CoreFlowOrmMapper.InstanceToDomain(entity) : null;
  }

  public async FindInstanceByBusinessReference(
    businessReference: string,
    warehouseCode?: string,
    ownerCode?: string,
  ): Promise<CoreFlowInstanceEntity | null> {
    const query = this.instances
      .createQueryBuilder('coreFlow')
      .where('coreFlow.BusinessReference = :businessReference', { businessReference });

    if (warehouseCode) {
      query.andWhere('coreFlow.WarehouseCode = :warehouseCode', { warehouseCode });
    }

    if (ownerCode) {
      query.andWhere('coreFlow.OwnerCode = :ownerCode', { ownerCode });
    }

    const entity = await query.getOne();
    return entity ? CoreFlowOrmMapper.InstanceToDomain(entity) : null;
  }

  public async CreateMilestone(
    milestone: WorkflowMilestoneEntity,
    manager?: EntityManager,
  ): Promise<WorkflowMilestoneEntity> {
    const repo = manager ? manager.getRepository(WorkflowMilestoneOrmEntity) : this.milestones;
    const created = await repo.save(CoreFlowOrmMapper.MilestoneToOrm(milestone));
    return CoreFlowOrmMapper.MilestoneToDomain(created);
  }

  public async ListMilestones(filter: WorkflowMilestoneListFilter): Promise<WorkflowMilestoneEntity[]> {
    const where: FindOptionsWhere<WorkflowMilestoneOrmEntity> = { CoreFlowInstanceId: filter.CoreFlowInstanceId };
    if (filter.StageCode) where.StageCode = filter.StageCode;
    if (filter.StepCode) where.StepCode = filter.StepCode;

    const entities = await this.milestones.find({ where, order: { OccurredAt: 'ASC' } });
    return entities.map(CoreFlowOrmMapper.MilestoneToDomain);
  }

  public async CreateHandoff(handoff: WorkflowHandoffEntity, manager?: EntityManager): Promise<WorkflowHandoffEntity> {
    const repo = manager ? manager.getRepository(WorkflowHandoffOrmEntity) : this.handoffs;
    const created = await repo.save(CoreFlowOrmMapper.HandoffToOrm(handoff));
    return CoreFlowOrmMapper.HandoffToDomain(created);
  }
}
