import { EntityManager } from 'typeorm';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';

export const EXCEPTION_CASE_REPOSITORY = Symbol('IExceptionCaseRepository');

export interface ExceptionCaseListFilter {
  State?: ExceptionState;
  ExceptionType?: string;
  ReferenceType?: string;
  ReferenceId?: string;
  WarehouseId?: string;
  OwnerId?: string;
  AssignedToUserId?: string;
  Severity?: ControlExceptionSeverity;
}

/**
 * Port for exception cases (C9). Manager-aware so each lifecycle transition + its audit row
 * commit in one transaction (AuditedTransaction). There is intentionally NO Delete — an
 * exception case is never deleted; cancel/duplicate are recorded as `Outcome`.
 */
export interface IExceptionCaseRepository {
  FindById(id: string, manager?: EntityManager): Promise<ExceptionCaseEntity | null>;
  /** Locked read (pessimistic_write) for the transition transaction — closes the transition race. */
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<ExceptionCaseEntity | null>;
  Create(entity: ExceptionCaseEntity, manager?: EntityManager): Promise<ExceptionCaseEntity>;
  Update(entity: ExceptionCaseEntity, manager?: EntityManager): Promise<ExceptionCaseEntity>;
  List(
    skip: number,
    take: number,
    filter?: ExceptionCaseListFilter,
  ): Promise<{ Items: ExceptionCaseEntity[]; TotalItems: number }>;
}
