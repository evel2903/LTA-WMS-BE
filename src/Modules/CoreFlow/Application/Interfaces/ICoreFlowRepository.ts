import { EntityManager } from 'typeorm';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';

export const CORE_FLOW_REPOSITORY = Symbol('ICoreFlowRepository');

export interface WorkflowMilestoneListFilter {
  CoreFlowInstanceId: string;
  StageCode?: CoreFlowStageCode;
  StepCode?: CoreFlowStepCode;
}

export interface ICoreFlowRepository {
  CreateInstance(instance: CoreFlowInstanceEntity, manager?: EntityManager): Promise<CoreFlowInstanceEntity>;
  UpdateInstance(instance: CoreFlowInstanceEntity, manager?: EntityManager): Promise<CoreFlowInstanceEntity>;
  FindInstanceById(id: string): Promise<CoreFlowInstanceEntity | null>;
  FindInstanceByBusinessReference(
    businessReference: string,
    warehouseCode?: string,
    ownerCode?: string,
  ): Promise<CoreFlowInstanceEntity | null>;
  CreateMilestone(milestone: WorkflowMilestoneEntity, manager?: EntityManager): Promise<WorkflowMilestoneEntity>;
  ListMilestones(filter: WorkflowMilestoneListFilter): Promise<WorkflowMilestoneEntity[]>;
  CreateHandoff(handoff: WorkflowHandoffEntity, manager?: EntityManager): Promise<WorkflowHandoffEntity>;
}
