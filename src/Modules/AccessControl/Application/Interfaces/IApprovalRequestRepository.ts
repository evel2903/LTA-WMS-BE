import { EntityManager } from 'typeorm';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { ApprovalRequestEntity } from '@modules/AccessControl/Domain/Entities/ApprovalRequestEntity';

export const APPROVAL_REQUEST_REPOSITORY = Symbol('IApprovalRequestRepository');

export interface ApprovalRequestListFilter {
  Decision?: ApprovalDecision;
  RequesterUserId?: string;
  TargetObjectType?: ObjectType;
  TargetObjectId?: string;
  Action?: ActionCode;
}

export interface IApprovalRequestRepository {
  FindById(id: string, manager?: EntityManager): Promise<ApprovalRequestEntity | null>;
  Create(request: ApprovalRequestEntity, manager?: EntityManager): Promise<ApprovalRequestEntity>;
  Update(request: ApprovalRequestEntity, manager?: EntityManager): Promise<ApprovalRequestEntity>;
  List(
    skip: number,
    take: number,
    filter?: ApprovalRequestListFilter,
  ): Promise<{ Items: ApprovalRequestEntity[]; TotalItems: number }>;
}
