import { EntityManager } from 'typeorm';
import { WarehouseProfileAssignmentEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignmentEntity';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';

export const WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY = Symbol('IWarehouseProfileAssignmentRepository');

export type WarehouseProfileAssignmentListFilter = {
  AssignmentType?: AssignmentType;
};

export interface IWarehouseProfileAssignmentRepository {
  FindById(id: string): Promise<WarehouseProfileAssignmentEntity | null>;
  Create(
    assignment: WarehouseProfileAssignmentEntity,
    manager?: EntityManager,
  ): Promise<WarehouseProfileAssignmentEntity>;
  ListByProfile(
    warehouseProfileId: string,
    skip: number,
    take: number,
    filter?: WarehouseProfileAssignmentListFilter,
  ): Promise<{ Items: WarehouseProfileAssignmentEntity[]; TotalItems: number }>;
}
