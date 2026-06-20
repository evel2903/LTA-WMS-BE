import { EntityManager } from 'typeorm';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';

export const DATA_SCOPE_REPOSITORY = Symbol('IDataScopeRepository');

export interface PrincipalRef {
  Type: PrincipalType;
  Id: string;
}

export interface IDataScopeRepository {
  FindByPrincipal(principalType: PrincipalType, principalId: string): Promise<DataScopeEntity[]>;
  /** Resolve scopes for several principals at once (user + their roles). Empty input → []. */
  FindByPrincipals(refs: PrincipalRef[]): Promise<DataScopeEntity[]>;
  /** `manager` lets a use case write inside an AuditedTransaction (C5). */
  Create(scope: DataScopeEntity, manager?: EntityManager): Promise<DataScopeEntity>;
  Delete(id: string, manager?: EntityManager): Promise<void>;
}
