import { EntityManager } from 'typeorm';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { OverrideLogEntity } from '@modules/WarehouseProfile/Domain/Entities/OverrideLogEntity';

export const OVERRIDE_LOG_REPOSITORY = Symbol('IOverrideLogRepository');

/** Frequency-query filter (FR-19): by rule, actor, target and created-at window. */
export interface OverrideLogListFilter {
  RuleId?: string;
  ActorUserId?: string;
  TargetObjectType?: ObjectType;
  TargetObjectId?: string;
  ApprovalRequestId?: string;
  From?: Date;
  To?: Date;
}

/**
 * Port for the append-only override_logs table. There is intentionally NO Update/Delete:
 * override_logs is immutable (AC1), enforced by a DB trigger as well. `Create` is manager-aware
 * so the insert shares the audit transaction (AC5).
 */
export interface IOverrideLogRepository {
  Create(entity: OverrideLogEntity, manager?: EntityManager): Promise<OverrideLogEntity>;
  FindById(id: string): Promise<OverrideLogEntity | null>;
  List(
    skip: number,
    take: number,
    filter?: OverrideLogListFilter,
  ): Promise<{ Items: OverrideLogEntity[]; TotalItems: number }>;
}
